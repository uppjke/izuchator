import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import Redis from 'ioredis'

// Интерфейсы для типизации
interface UserPresence {
  userId: string
  socketId: string
  lastSeen: number
  roomId: string
}

interface PresenceMessage {
  type: 'join' | 'leave' | 'heartbeat'
  userId: string
  timestamp: number
}

/**
 * Современный Socket.io + Redis сервер для presence tracking
 * Enterprise-grade решение для российских платформ
 */
class PresenceServer {
  private io: SocketIOServer
  private redis: Redis
  private server: ReturnType<typeof createServer>
  private userPresence = new Map<string, UserPresence>() // socketId -> UserPresence
  private userSockets = new Map<string, string>() // userId -> socketId
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(port: number = 3002) {
    // Создаем HTTP сервер
    this.server = createServer()
    
    // Настраиваем Socket.io с CORS для Next.js и мобильных устройств
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://izuchator.ru', 'https://www.izuchator.ru']
          : true, // В development разрешаем все origins
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['*']
      },
      transports: ['websocket', 'polling'], // Fallback на polling для мобильных
      pingTimeout: 60000,
      pingInterval: 25000,
      allowEIO3: true // Поддержка старых клиентов
    })

    // Подключаемся к Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true
    })

    this.setupEventHandlers()
    this.startCleanupTimer()
    
    this.server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Presence server running on port ${port}`)
      console.log(`📍 Available at:`)
      console.log(`   - http://localhost:${port}`)
      console.log(`   - http://127.0.0.1:${port}`)
      
      // Показываем все сетевые интерфейсы
      const { networkInterfaces } = require('os')
      const nets = networkInterfaces()
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
          // Показываем только IPv4 адреса, исключая internal
          if (net.family === 'IPv4' && !net.internal) {
            console.log(`   - http://${net.address}:${port}`)
          }
        }
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`)

      // Обработка присоединения пользователя
      socket.on('join-presence', async (data: { userId: string }) => {
        await this.handleUserJoin(socket, data.userId)
      })

      // Обработка heartbeat
      socket.on('heartbeat', async (data: { userId: string }) => {
        await this.handleHeartbeat(socket.id, data.userId)
      })

      // Обработка отключения
      socket.on('disconnect', async () => {
        await this.handleUserLeave(socket.id)
      })

      // Обработка manual leave
      socket.on('leave-presence', async () => {
        await this.handleUserLeave(socket.id)
      })
    })

    // Обработка ошибок Redis
    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err)
    })

    this.redis.on('connect', () => {
      console.log('📡 Connected to Redis')
    })
  }

  private async handleUserJoin(socket: any, userId: string) {
    try {
      const now = Date.now()
      const roomId = 'global-presence'

      // Если пользователь уже подключен с другого устройства - отключаем старое соединение
      const existingSocketId = this.userSockets.get(userId)
      if (existingSocketId && existingSocketId !== socket.id) {
        await this.handleUserLeave(existingSocketId)
      }

      // Создаем новую запись присутствия
      const presence: UserPresence = {
        userId,
        socketId: socket.id,
        lastSeen: now,
        roomId
      }

      this.userPresence.set(socket.id, presence)
      this.userSockets.set(userId, socket.id)

      // Присоединяем к комнате
      socket.join(roomId)

      // Сохраняем в Redis для масштабирования на несколько серверов
      await this.redis.setex(`presence:${userId}`, 120, JSON.stringify({
        lastSeen: now,
        serverId: process.env.SERVER_ID || 'default'
      }))

      // Уведомляем всех о новом онлайн пользователе
      await this.broadcastPresenceUpdate()

      console.log(`User ${userId} joined presence (socket: ${socket.id})`)
    } catch (error) {
      console.error('Error handling user join:', error)
    }
  }

  private async handleHeartbeat(socketId: string, userId: string) {
    const presence = this.userPresence.get(socketId)
    if (presence && presence.userId === userId) {
      presence.lastSeen = Date.now()
      
      // Обновляем в Redis
      await this.redis.setex(`presence:${userId}`, 120, JSON.stringify({
        lastSeen: presence.lastSeen,
        serverId: process.env.SERVER_ID || 'default'
      }))
    }
  }

  private async handleUserLeave(socketId: string) {
    try {
      const presence = this.userPresence.get(socketId)
      if (!presence) return

      // Удаляем из локальных структур данных
      this.userPresence.delete(socketId)
      this.userSockets.delete(presence.userId)

      // Удаляем из Redis
      await this.redis.del(`presence:${presence.userId}`)

      // Уведомляем всех об отключении
      await this.broadcastPresenceUpdate()

      console.log(`User ${presence.userId} left presence (socket: ${socketId})`)
    } catch (error) {
      console.error('Error handling user leave:', error)
    }
  }

  private async broadcastPresenceUpdate() {
    try {
      // Собираем список онлайн пользователей
      const onlineUsers = Array.from(this.userPresence.values()).map(p => p.userId)
      
      // Отправляем всем в комнате
      this.io.to('global-presence').emit('presence-update', {
        onlineUsers,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error broadcasting presence update:', error)
    }
  }

  private startCleanupTimer() {
    // Каждые 30 секунд проверяем неактивных пользователей
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now()
      const TIMEOUT = 90000 // 1.5 минуты

      let hasChanges = false

      for (const [socketId, presence] of this.userPresence) {
        if (now - presence.lastSeen > TIMEOUT) {
          await this.handleUserLeave(socketId)
          hasChanges = true
        }
      }

      if (hasChanges) {
        await this.broadcastPresenceUpdate()
      }
    }, 30000)
  }

  public async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    await this.redis.quit()
    this.server.close()
  }
}

// Запуск сервера если файл запущен напрямую
if (require.main === module) {
  const port = parseInt(process.env.PRESENCE_PORT || '3002')
  new PresenceServer(port)
}

export default PresenceServer
