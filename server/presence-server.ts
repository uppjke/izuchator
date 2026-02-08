import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { URL } from 'node:url'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  UserPresence,
  PresenceServerConfig,
  PresenceMetrics,
  JoinPresencePayload,
} from './types'

// Typed socket
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

/**
 * Production-grade Presence Server
 * - Typed Socket.io events
 * - Redis Pub/Sub для multi-server scaling
 * - Health check endpoint
 * - Graceful shutdown
 * - Connection rate limiting
 * - Last seen tracking
 */
class PresenceServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  private redisPub: Redis
  private redisSub: Redis
  private redisStore: Redis
  private server: ReturnType<typeof createHttpServer>
  
  // Local state
  private userPresence = new Map<string, UserPresence>() // socketId -> UserPresence
  private userSockets = new Map<string, Set<string>>() // userId -> Set<socketId> (multi-device)
  private lastSeenMap = new Map<string, number>() // userId -> timestamp
  private connectionsByIp = new Map<string, number>() // ip -> count
  
  // Intervals
  private cleanupInterval: NodeJS.Timeout | null = null
  private metricsInterval: NodeJS.Timeout | null = null
  
  // Metrics
  private startTime = Date.now()
  private messageCount = 0
  
  private config: PresenceServerConfig
  private useTls = false

  constructor(config: Partial<PresenceServerConfig> = {}) {
    this.config = {
      port: parseInt(process.env.PRESENCE_PORT || '3002'),
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      corsOrigins: process.env.NODE_ENV === 'production'
        ? ['https://izuchator.ru', 'https://www.izuchator.ru']
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://localhost:3000', 'https://127.0.0.1:3000'],
      pingTimeout: 60000,
      pingInterval: 25000,
      cleanupInterval: 30000,
      userTimeout: 90000, // 1.5 минуты
      maxConnectionsPerIp: 20,
      ...config
    }

    // Создаем HTTP/HTTPS сервер
    const certPath = process.env.TLS_CERT || ''
    const keyPath = process.env.TLS_KEY || ''
    this.useTls = !!(certPath && keyPath && existsSync(certPath) && existsSync(keyPath))

    if (this.useTls) {
      const tlsOptions = {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
      }
      this.server = createHttpsServer(tlsOptions, (req, res) => this.handleHttpRequest(req, res))
      console.log('🔒 TLS enabled for presence server')
    } else {
      this.server = createHttpServer((req, res) => this.handleHttpRequest(req, res))
      console.log('⚠️  No TLS certs found, running HTTP')
    }
    
    // Redis connections
    this.redisPub = new Redis(this.config.redisUrl, { lazyConnect: true })
    this.redisSub = new Redis(this.config.redisUrl, { lazyConnect: true })
    this.redisStore = new Redis(this.config.redisUrl, { lazyConnect: true })

    // Socket.io с типизацией
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? this.config.corsOrigins 
          : true,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling', 'websocket'],
      pingTimeout: 30000,
      pingInterval: 15000,
      allowEIO3: true,
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 минуты
        skipMiddlewares: true,
      }
    })

    this.init()
  }

  private async init() {
    try {
      // Подключаемся к Redis
      await Promise.all([
        this.redisPub.connect(),
        this.redisSub.connect(),
        this.redisStore.connect()
      ])
      console.log('📡 Connected to Redis')

      // Redis adapter для multi-server
      this.io.adapter(createAdapter(this.redisPub, this.redisSub))
      console.log('🔗 Redis adapter enabled')

      // Восстанавливаем lastSeen из Redis
      await this.restoreLastSeen()

      // Setup handlers
      this.setupMiddleware()
      this.setupEventHandlers()
      this.setupBoardNamespace()
      this.setupRedisHandlers()
      this.startCleanupTimer()
      this.startMetricsTimer()
      this.setupGracefulShutdown()

      // Start server
      this.server.listen(this.config.port, '0.0.0.0', () => {
        console.log(`🚀 Presence server running on port ${this.config.port}`)
        this.logNetworkInterfaces()
      })
    } catch (error) {
      console.error('❌ Failed to initialize presence server:', error)
      process.exit(1)
    }
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)

    // CORS headers for dev
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    }

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/healthz') {
      const health = {
        status: 'ok',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        connections: this.io.engine?.clientsCount || 0,
        onlineUsers: this.getOnlineUserIds().length,
        redis: this.redisPub.status === 'ready'
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(health))
      return
    }

    // Metrics endpoint (Prometheus format)
    if (url.pathname === '/metrics') {
      const metrics = this.getMetrics()
      const prometheusMetrics = [
        `# HELP presence_connected_sockets Number of connected sockets`,
        `# TYPE presence_connected_sockets gauge`,
        `presence_connected_sockets ${metrics.connectedSockets}`,
        `# HELP presence_online_users Number of online users`,
        `# TYPE presence_online_users gauge`,
        `presence_online_users ${metrics.onlineUsers}`,
        `# HELP presence_uptime_seconds Server uptime in seconds`,
        `# TYPE presence_uptime_seconds counter`,
        `presence_uptime_seconds ${metrics.uptime}`,
        `# HELP presence_redis_connected Redis connection status`,
        `# TYPE presence_redis_connected gauge`,
        `presence_redis_connected ${metrics.redisConnected ? 1 : 0}`,
      ].join('\n')

      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end(prometheusMetrics)
      return
    }

    // Default response
    res.writeHead(404)
    res.end('Not found')
  }

  private setupMiddleware() {
    // Rate limiting middleware — applies to default namespace
    const rateLimitMiddleware = (socket: any, next: (err?: Error) => void) => {
      const ip = socket.handshake.address
      const count = this.connectionsByIp.get(ip) || 0

      if (count >= this.config.maxConnectionsPerIp) {
        console.warn(`⚠️ Rate limit: ${ip} has ${count} connections (max ${this.config.maxConnectionsPerIp})`)
        return next(new Error('Too many connections from this IP'))
      }

      this.connectionsByIp.set(ip, count + 1)
      
      socket.on('disconnect', () => {
        const current = this.connectionsByIp.get(ip) || 1
        if (current <= 1) {
          this.connectionsByIp.delete(ip)
        } else {
          this.connectionsByIp.set(ip, current - 1)
        }
      })

      next()
    }

    // Apply to both default and /board namespace
    this.io.use(rateLimitMiddleware)
    this.io.of('/board').use(rateLimitMiddleware)
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: TypedSocket) => {
      console.log(`Socket connected: ${socket.id}`)

      socket.on('join-presence', (data) => this.handleJoin(socket, data))
      socket.on('heartbeat', (data) => this.handleHeartbeat(socket, data))
      socket.on('leave-presence', () => this.handleLeave(socket))
      socket.on('get-user-status', (data, callback) => this.handleGetUserStatus(data, callback))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })
  }

  private setupRedisHandlers() {
    this.redisPub.on('error', (err) => console.error('Redis pub error:', err))
    this.redisSub.on('error', (err) => console.error('Redis sub error:', err))
    this.redisStore.on('error', (err) => console.error('Redis store error:', err))
  }

  // ========================================================================
  // Board namespace — real-time доска для уроков
  // ========================================================================

  private boardUsers = new Map<string, Map<string, { userId: string; userName: string; socketId: string }>>()
  // boardId -> Map<userId, { userId, userName, socketId }>

  private setupBoardNamespace() {
    const boardNsp = this.io.of('/board')

    boardNsp.on('connection', (socket) => {
      console.log(`🎨 Board socket connected: ${socket.id}`)

      socket.on('board:join', ({ boardId, userId, userName: clientUserName }) => {
        socket.join(boardId)
        socket.data.boardId = boardId
        socket.data.userId = userId

        // Track user in board
        if (!this.boardUsers.has(boardId)) {
          this.boardUsers.set(boardId, new Map())
        }
        const users = this.boardUsers.get(boardId)!
        const userName = clientUserName || userId.slice(0, 8)
        users.set(userId, { userId, userName, socketId: socket.id })

        // Notify others
        socket.to(boardId).emit('board:user-joined', { userId, userName })

        // Send current users list
        const currentUsers = Array.from(users.values()).map(u => ({
          userId: u.userId,
          userName: u.userName,
        }))
        socket.emit('board:users', { users: currentUsers })

        // Request state sync from an existing peer (if any)
        // This ensures the joining user gets the latest unsaved state
        const otherUser = Array.from(users.values()).find(u => u.userId !== userId)
        if (otherUser) {
          const boardNsp = this.io.of('/board')
          boardNsp.to(otherUser.socketId).emit('board:request-state', { requesterId: socket.id })
          console.log(`🔄 Requesting state sync from ${otherUser.userId} for joining ${userId}`)
        }

        console.log(`🎨 User ${userId} joined board ${boardId} (${users.size} users)`)
      })

      socket.on('board:leave', ({ boardId }) => {
        this.handleBoardLeave(socket, boardId)
      })

      socket.on('board:draw', ({ boardId, element }) => {
        socket.to(boardId).emit('board:draw', {
          element,
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:draw-progress', ({ boardId, element }) => {
        socket.to(boardId).emit('board:draw-progress', {
          element,
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:move-batch', ({ boardId, elements }) => {
        socket.to(boardId).emit('board:move-batch', {
          elements,
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:move-delta', ({ boardId, elementIds, dx, dy }) => {
        socket.to(boardId).emit('board:move-delta', {
          elementIds,
          dx,
          dy,
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:resize-delta', ({ boardId, elementIds, handle, dx, dy, originalBounds }) => {
        socket.to(boardId).emit('board:resize-delta', {
          elementIds,
          handle,
          dx,
          dy,
          originalBounds,
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:erase', ({ boardId, elementIds }) => {
        socket.to(boardId).emit('board:erase', {
          elementIds,
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:select', ({ boardId, elementIds }) => {
        socket.to(boardId).emit('board:select', {
          elementIds,
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:cursor', ({ boardId, x, y, userId }) => {
        const users = this.boardUsers.get(boardId)
        const user = users?.get(userId)
        socket.to(boardId).emit('board:cursor', {
          x,
          y,
          userId,
          userName: user?.userName || userId.slice(0, 8),
        })
      })

      socket.on('board:clear', ({ boardId }) => {
        socket.to(boardId).emit('board:clear', {
          userId: socket.data.userId || '',
        })
      })

      socket.on('board:undo', ({ boardId, elementId }) => {
        socket.to(boardId).emit('board:undo', {
          elementId,
          userId: socket.data.userId || '',
        })
      })

      // State sync: forward elements from existing user to joining user
      socket.on('board:state-response', ({ requesterId, elements }) => {
        const boardNsp = this.io.of('/board')
        boardNsp.to(requesterId).emit('board:sync-state', { elements })
      })

      // ========== WebRTC signaling relay ==========
      socket.on('board:rtc-offer', ({ boardId, targetUserId, offer }) => {
        const users = this.boardUsers.get(boardId)
        const target = users?.get(targetUserId)
        if (target) {
          const boardNsp = this.io.of('/board')
          boardNsp.to(target.socketId).emit('board:rtc-offer', {
            fromUserId: socket.data.userId || '',
            offer,
          })
          console.log(`📹 RTC offer: ${socket.data.userId} → ${targetUserId}`)
        }
      })

      socket.on('board:rtc-answer', ({ boardId, targetUserId, answer }) => {
        const users = this.boardUsers.get(boardId)
        const target = users?.get(targetUserId)
        if (target) {
          const boardNsp = this.io.of('/board')
          boardNsp.to(target.socketId).emit('board:rtc-answer', {
            fromUserId: socket.data.userId || '',
            answer,
          })
          console.log(`📹 RTC answer: ${socket.data.userId} → ${targetUserId}`)
        }
      })

      socket.on('board:rtc-ice-candidate', ({ boardId, targetUserId, candidate }) => {
        const users = this.boardUsers.get(boardId)
        const target = users?.get(targetUserId)
        if (target) {
          const boardNsp = this.io.of('/board')
          boardNsp.to(target.socketId).emit('board:rtc-ice-candidate', {
            fromUserId: socket.data.userId || '',
            candidate,
          })
        }
      })

      socket.on('board:rtc-hangup', ({ boardId }) => {
        socket.to(boardId).emit('board:rtc-hangup', {
          fromUserId: socket.data.userId || '',
        })
        console.log(`📹 RTC hangup: ${socket.data.userId} in board ${boardId}`)
      })

      // When a user signals they're ready for RTC, broadcast to room
      // so users with active media can send offers
      socket.on('board:rtc-ready', ({ boardId }) => {
        socket.to(boardId).emit('board:rtc-ready', {
          fromUserId: socket.data.userId || '',
        })
        console.log(`📹 RTC ready: ${socket.data.userId} in board ${boardId}`)
      })

      socket.on('disconnect', () => {
        const boardId = socket.data.boardId as string | undefined
        if (boardId) {
          this.handleBoardLeave(socket, boardId)
        }
      })
    })
  }

  private handleBoardLeave(socket: TypedSocket | { data: Record<string, unknown>; id: string }, boardId: string) {
    const userId = socket.data.userId as string | undefined
    if (!userId) return

    const users = this.boardUsers.get(boardId)
    if (users) {
      const tracked = users.get(userId)
      // Only remove if this socket is still the current one for this user.
      // A newer socket may have already replaced it after a fast reload.
      if (tracked && tracked.socketId !== socket.id) {
        console.log(`🎨 Ignoring stale leave for ${userId} (socket ${socket.id} ≠ ${tracked.socketId})`)
        return
      }
      users.delete(userId)
      if (users.size === 0) {
        this.boardUsers.delete(boardId)
      }
    }

    // Notify room
    this.io.of('/board').to(boardId).emit('board:user-left', { userId })
    console.log(`🎨 User ${userId} left board ${boardId}`)
  }

  private async handleJoin(socket: TypedSocket, data: JoinPresencePayload) {
    try {
      const { userId, metadata } = data
      
      if (!userId || typeof userId !== 'string') {
        socket.emit('error', { code: 'INVALID_USER_ID', message: 'Invalid user ID' })
        return
      }

      const now = Date.now()
      const deviceType = metadata?.deviceType || this.detectDeviceType(metadata?.userAgent)

      // Сохраняем данные в socket
      socket.data.userId = userId
      socket.data.joinedAt = now
      socket.data.lastHeartbeat = now

      // Создаем запись присутствия
      const presence: UserPresence = {
        userId,
        socketId: socket.id,
        lastSeen: now,
        joinedAt: now,
        deviceType
      }

      this.userPresence.set(socket.id, presence)

      // Multi-device: добавляем socket к пользователю
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set())
      }
      this.userSockets.get(userId)!.add(socket.id)

      // Присоединяем к глобальной комнате
      socket.join('global-presence')

      // Сохраняем в Redis
      await this.redisStore.hset(`presence:${userId}`, {
        lastSeen: now.toString(),
        deviceType,
        serverId: process.env.SERVER_ID || 'default'
      })
      await this.redisStore.expire(`presence:${userId}`, 300) // 5 минут TTL

      // Уведомляем всех о новом онлайн пользователе
      const wasOffline = !this.lastSeenMap.has(userId) || 
        (this.userSockets.get(userId)?.size === 1)
      
      if (wasOffline) {
        this.io.to('global-presence').emit('user-online', { userId, timestamp: now })
      }

      // Отправляем полный список онлайн
      await this.broadcastPresenceUpdate()

      console.log(`✅ User ${userId} joined (socket: ${socket.id}, device: ${deviceType})`)
      this.messageCount++
    } catch (error) {
      console.error('Error in handleJoin:', error)
      socket.emit('error', { code: 'JOIN_ERROR', message: 'Failed to join presence' })
    }
  }

  private async handleHeartbeat(socket: TypedSocket, data: { userId: string }) {
    const presence = this.userPresence.get(socket.id)
    
    if (presence && presence.userId === data.userId) {
      const now = Date.now()
      presence.lastSeen = now
      socket.data.lastHeartbeat = now

      // Обновляем в Redis
      await this.redisStore.hset(`presence:${presence.userId}`, 'lastSeen', now.toString())
      await this.redisStore.expire(`presence:${presence.userId}`, 300)
      
      this.messageCount++
    }
  }

  private handleGetUserStatus(
    data: { userId: string }, 
    callback: (response: { userId: string; isOnline: boolean; lastSeen: number | null }) => void
  ) {
    const isOnline = this.userSockets.has(data.userId) && 
      (this.userSockets.get(data.userId)?.size || 0) > 0
    const lastSeen = this.lastSeenMap.get(data.userId) || null

    callback({ userId: data.userId, isOnline, lastSeen })
  }

  private async handleLeave(socket: TypedSocket) {
    await this.removeSocket(socket, 'manual')
  }

  private async handleDisconnect(socket: TypedSocket) {
    await this.removeSocket(socket, 'disconnect')
  }

  private async removeSocket(socket: TypedSocket, reason: string) {
    const presence = this.userPresence.get(socket.id)
    if (!presence) return

    const { userId } = presence
    const now = Date.now()

    // Удаляем socket из presence
    this.userPresence.delete(socket.id)

    // Удаляем socket из user sockets
    const userSocketSet = this.userSockets.get(userId)
    if (userSocketSet) {
      userSocketSet.delete(socket.id)
      
      // Если это был последний socket пользователя - он офлайн
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId)
        this.lastSeenMap.set(userId, now)
        
        // Сохраняем last seen в Redis
        await this.redisStore.set(`lastSeen:${userId}`, now.toString())
        await this.redisStore.del(`presence:${userId}`)

        // Уведомляем об офлайне
        this.io.to('global-presence').emit('user-offline', { userId, lastSeen: now })
      }
    }

    // Broadcast update
    await this.broadcastPresenceUpdate()
    
    console.log(`❌ User ${userId} socket removed (${reason}, socket: ${socket.id})`)
  }

  private async broadcastPresenceUpdate() {
    const onlineUsers = this.getOnlineUserIds()
    const lastSeenObj: Record<string, number> = {}
    
    this.lastSeenMap.forEach((time, id) => {
      lastSeenObj[id] = time
    })

    this.io.to('global-presence').emit('presence-update', {
      onlineUsers,
      lastSeenMap: lastSeenObj,
      timestamp: Date.now()
    })
  }

  private getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys()).filter(
      userId => (this.userSockets.get(userId)?.size || 0) > 0
    )
  }

  private async restoreLastSeen() {
    try {
      const keys = await this.redisStore.keys('lastSeen:*')
      for (const key of keys) {
        const userId = key.replace('lastSeen:', '')
        const lastSeen = await this.redisStore.get(key)
        if (lastSeen) {
          this.lastSeenMap.set(userId, parseInt(lastSeen))
        }
      }
      console.log(`📥 Restored ${this.lastSeenMap.size} last seen records`)
    } catch (error) {
      console.error('Error restoring last seen:', error)
    }
  }

  private startCleanupTimer() {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now()
      let hasChanges = false

      for (const [socketId, presence] of this.userPresence) {
        if (now - presence.lastSeen > this.config.userTimeout) {
          const socket = this.io.sockets.sockets.get(socketId)
          if (socket) {
            await this.removeSocket(socket as TypedSocket, 'timeout')
            hasChanges = true
          }
        }
      }

      if (hasChanges) {
        await this.broadcastPresenceUpdate()
      }
    }, this.config.cleanupInterval)
  }

  private startMetricsTimer() {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getMetrics()
      console.log(`📊 Metrics: ${metrics.onlineUsers} users, ${metrics.connectedSockets} sockets, ${this.messageCount} msg/30s`)
      this.messageCount = 0
    }, 30000)
  }

  private getMetrics(): PresenceMetrics {
    return {
      connectedSockets: this.io.engine?.clientsCount || 0,
      onlineUsers: this.getOnlineUserIds().length,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      messagesPerSecond: this.messageCount / 30,
      redisConnected: this.redisPub.status === 'ready'
    }
  }

  private detectDeviceType(userAgent?: string): 'desktop' | 'mobile' | 'tablet' {
    if (!userAgent) return 'desktop'
    if (/tablet|ipad/i.test(userAgent)) return 'tablet'
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile'
    return 'desktop'
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`)
      
      // Останавливаем таймеры
      if (this.cleanupInterval) clearInterval(this.cleanupInterval)
      if (this.metricsInterval) clearInterval(this.metricsInterval)

      // Уведомляем всех клиентов
      this.io.emit('error', { code: 'SERVER_SHUTDOWN', message: 'Server is shutting down' })

      // Закрываем соединения
      this.io.close()
      
      // Закрываем Redis
      await Promise.all([
        this.redisPub.quit(),
        this.redisSub.quit(),
        this.redisStore.quit()
      ])

      // Закрываем HTTP сервер
      this.server.close(() => {
        console.log('✅ Server closed gracefully')
        process.exit(0)
      })

      // Force exit after 10s
      setTimeout(() => {
        console.log('⚠️ Force exit after timeout')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  }

  private logNetworkInterfaces() {
    const proto = this.useTls ? 'https' : 'http'
    console.log('📍 Available at:')
    console.log(`   - ${proto}://localhost:${this.config.port}`)
    console.log(`   - ${proto}://127.0.0.1:${this.config.port}`)

    const { networkInterfaces } = require('os')
    const nets = networkInterfaces()

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]!) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`   - ${proto}://${net.address}:${this.config.port}`)
        }
      }
    }
    
    console.log(`\n📋 Endpoints:`)
    console.log(`   - Health: ${proto}://localhost:${this.config.port}/health`)
    console.log(`   - Metrics: ${proto}://localhost:${this.config.port}/metrics`)
  }
}

// Запуск
if (require.main === module) {
  new PresenceServer()
}

export default PresenceServer
