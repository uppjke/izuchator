'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

interface PresenceState {
  onlineUsers: Set<string>
  isUserOnline: (userId: string) => boolean
  isTracking: boolean
}

/**
 * Modern presence hook using Socket.io + Redis
 * Enterprise-grade решение для российских платформ
 */
export function usePresence(): PresenceState {
  const { data: session } = useSession()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [isTracking, setIsTracking] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Presence отключён если не задан NEXT_PUBLIC_PRESENCE_SERVER
    if (!process.env.NEXT_PUBLIC_PRESENCE_SERVER) {
      return
    }

    // Подключаемся только если пользователь аутентифицирован
    if (!session?.user?.id) {
      setIsTracking(false)
      return
    }

    const userId = session.user.id
    
    // Определяем является ли устройство мобильным
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Используем NEXT_PUBLIC_PRESENCE_SERVER
    const presenceServerUrl = process.env.NEXT_PUBLIC_PRESENCE_SERVER
    
    const socket = io(presenceServerUrl, {
      transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling'], // Для мобильных prioritize polling
      timeout: 5000, // Быстрый таймаут
      forceNew: false,
      autoConnect: true,
      upgrade: !isMobile, // Отключаем upgrade для мобильных
      rememberUpgrade: false,
      reconnection: true,
      reconnectionAttempts: 1, // Минимум попыток - presence опционален
      reconnectionDelay: 5000,
      withCredentials: false // Для мобильных устройств
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('🚀 Connected to presence server')
      console.log('📱 User agent:', navigator.userAgent)
      console.log('📶 Transport:', (socket as { io?: { engine?: { transport?: { name?: string } } } }).io?.engine?.transport?.name)
      setIsTracking(true)
      
      // Присоединяемся к presence tracking
      socket.emit('join-presence', { userId })

      // Запускаем heartbeat каждые 30 секунд
      heartbeatRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat', { userId })
        }
      }, 30000)
    })

    socket.on('presence-update', (data: { onlineUsers: string[], timestamp: number }) => {
      // Обновляем список онлайн пользователей
      setOnlineUsers(new Set(data.onlineUsers))
      console.log('📡 Presence updated:', data.onlineUsers.length, 'users online')
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from presence server:', reason)
      setIsTracking(false)
      setOnlineUsers(new Set())
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    })

    socket.on('connect_error', (error) => {
      // Тихо обрабатываем ошибку - presence сервер опционален
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Presence server unavailable (optional):', error.message)
      }
      setIsTracking(false)
    })

    // Cleanup при размонтировании
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      
      if (socket.connected) {
        socket.emit('leave-presence')
      }
      
      socket.disconnect()
    }
  }, [session?.user?.id])

  const isUserOnline = (userId: string) => onlineUsers.has(userId)

  return {
    onlineUsers,
    isUserOnline,
    isTracking
  }
}
