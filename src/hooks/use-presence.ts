'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PresenceUpdatePayload,
} from '../../server/types'

// Typed socket для клиента
type TypedClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface PresenceState {
  onlineUsers: Set<string>
  lastSeenMap: Map<string, number>
  isUserOnline: (userId: string) => boolean
  getLastSeen: (userId: string) => number | null
  formatLastSeen: (userId: string) => string | null
  isTracking: boolean
  isConnected: boolean
}

// Exponential backoff конфигурация
const INITIAL_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000
const RECONNECT_MULTIPLIER = 2

/**
 * Production-grade presence hook
 * - Typed Socket.io events
 * - Exponential backoff reconnection
 * - Last seen formatting
 * - Multi-device support
 */
export function usePresence(): PresenceState {
  const { data: session } = useSession()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, number>>(new Map())
  const [isTracking, setIsTracking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  
  const socketRef = useRef<TypedClientSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Форматирование "был N минут назад"
  const formatLastSeen = useCallback((userId: string): string | null => {
    const lastSeen = lastSeenMap.get(userId)
    if (!lastSeen) return null

    const now = Date.now()
    const diff = now - lastSeen
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'только что'
    if (minutes < 60) {
      const form = getMinutesForm(minutes)
      return `${minutes} ${form} назад`
    }
    if (hours < 24) {
      const form = getHoursForm(hours)
      return `${hours} ${form} назад`
    }
    if (days < 7) {
      const form = getDaysForm(days)
      return `${days} ${form} назад`
    }
    
    // Более недели - показываем дату
    const date = new Date(lastSeen)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }, [lastSeenMap])

  const getLastSeen = useCallback((userId: string): number | null => {
    return lastSeenMap.get(userId) || null
  }, [lastSeenMap])

  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId)
  }, [onlineUsers])

  useEffect(() => {
    // Presence отключён если не задан NEXT_PUBLIC_PRESENCE_SERVER
    const envUrl = process.env.NEXT_PUBLIC_PRESENCE_SERVER
    if (!envUrl) {
      return
    }

    // Динамически подставляем hostname из браузера,
    // чтобы мобильные устройства в локальной сети (192.168.x.x)
    // подключались к правильному адресу вместо localhost
    let presenceServerUrl = envUrl
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(envUrl)
        url.hostname = window.location.hostname
        presenceServerUrl = url.origin
      } catch { /* fallback to env value */ }
    }

    // Подключаемся только если пользователь аутентифицирован
    if (!session?.user?.id) {
      setIsTracking(false)
      return
    }

    const userId = session.user.id
    
    // Определяем тип устройства
    const deviceType = detectDeviceType()
    const isMobile = deviceType !== 'desktop'
    
    let mounted = true
    let socket: TypedClientSocket | null = null

    // Delay connection to survive React 19 Strict Mode double-invoke
    const connectTimer = setTimeout(() => {
      if (!mounted) return

    // Создаём socket с типизацией
    socket = io(presenceServerUrl, {
      transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling'],
      timeout: 10000,
      forceNew: false,
      autoConnect: true,
      upgrade: !isMobile,
      rememberUpgrade: false,
      reconnection: false, // Мы сами управляем reconnection с exponential backoff
      withCredentials: false
    })

    socketRef.current = socket

    const connect = () => {
      if (socket && !socket.connected) {
        socket.connect()
      }
    }

    const scheduleReconnect = () => {
      if (!mounted) return
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_MULTIPLIER, reconnectAttemptRef.current),
        MAX_RECONNECT_DELAY
      )
      
      reconnectAttemptRef.current++
      
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`)
      
      reconnectTimeoutRef.current = setTimeout(connect, delay)
    }

    socket.on('connect', () => {
      if (!mounted) return
      console.log('🚀 Connected to presence server')
      setIsConnected(true)
      setIsTracking(true)
      reconnectAttemptRef.current = 0 // Reset on successful connect
      
      // Присоединяемся к presence tracking
      socket!.emit('join-presence', { 
        userId,
        metadata: {
          deviceType,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
        }
      })

      // Запускаем heartbeat
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      heartbeatRef.current = setInterval(() => {
        if (socket?.connected) {
          socket.emit('heartbeat', { userId, timestamp: Date.now() })
        }
      }, 30000)
    })

    socket.on('presence-update', (data: PresenceUpdatePayload) => {
      if (!mounted) return
      setOnlineUsers(new Set(data.onlineUsers))
      setLastSeenMap(new Map(Object.entries(data.lastSeenMap)))
    })

    socket.on('user-online', ({ userId: onlineUserId }) => {
      if (!mounted) return
      setOnlineUsers(prev => new Set(prev).add(onlineUserId))
    })

    socket.on('user-offline', ({ userId: offlineUserId, lastSeen }) => {
      if (!mounted) return
      setOnlineUsers(prev => {
        const next = new Set(prev)
        next.delete(offlineUserId)
        return next
      })
      setLastSeenMap(prev => new Map(prev).set(offlineUserId, lastSeen))
    })

    socket.on('disconnect', (reason) => {
      if (!mounted) return
      console.log('❌ Disconnected from presence server:', reason)
      setIsConnected(false)
      setIsTracking(false)
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }

      // Reconnect если это не намеренный disconnect
      if (reason !== 'io client disconnect') {
        scheduleReconnect()
      }
    })

    socket.on('connect_error', (error) => {
      if (!mounted) return
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Presence server unavailable (optional):', error.message)
      }
      setIsConnected(false)
      setIsTracking(false)
      scheduleReconnect()
    })

    socket.on('error', ({ code, message }) => {
      if (!mounted) return
      console.error('Presence error:', code, message)
      
      if (code === 'SERVER_SHUTDOWN') {
        // Сервер перезапускается - подождем и переподключимся
        scheduleReconnect()
      }
    })

    }, 100) // Delay to survive Strict Mode unmount

    // Cleanup
    return () => {
      mounted = false
      clearTimeout(connectTimer)

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (socket) {
        if (socket.connected) {
          socket.emit('leave-presence')
        }
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [session?.user?.id])

  return {
    onlineUsers,
    lastSeenMap,
    isUserOnline,
    getLastSeen,
    formatLastSeen,
    isTracking,
    isConnected
  }
}

// Helpers для склонения слов
function getMinutesForm(n: number): string {
  const lastTwo = n % 100
  const lastOne = n % 10
  
  if (lastTwo >= 11 && lastTwo <= 14) return 'минут'
  if (lastOne === 1) return 'минуту'
  if (lastOne >= 2 && lastOne <= 4) return 'минуты'
  return 'минут'
}

function getHoursForm(n: number): string {
  const lastTwo = n % 100
  const lastOne = n % 10
  
  if (lastTwo >= 11 && lastTwo <= 14) return 'часов'
  if (lastOne === 1) return 'час'
  if (lastOne >= 2 && lastOne <= 4) return 'часа'
  return 'часов'
}

function getDaysForm(n: number): string {
  const lastTwo = n % 100
  const lastOne = n % 10
  
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней'
  if (lastOne === 1) return 'день'
  if (lastOne >= 2 && lastOne <= 4) return 'дня'
  return 'дней'
}

function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobile|android|iphone/i.test(ua)) return 'mobile'
  return 'desktop'
}
