'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type PresenceData = {
  user_id: string
  email: string
  full_name: string
  last_seen: string
}

type PresenceState = {
  [key: string]: PresenceData[]
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [isTracking, setIsTracking] = useState(false)
  const { user } = useAuth()
  const supabase = createSupabaseBrowserClient()

  // Определяем iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream

  // Извлекаем full_name в отдельную переменную для зависимостей
  const userFullName = (user as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name

  useEffect(() => {
    if (!user?.id) return

    console.log('🔄 Starting simple presence for user:', user.id)
    
    // Простой канал присутствия
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    // Функция отправки присутствия
    const updatePresence = async () => {
      try {
        await channel.track({
          user_id: user.id,
          email: user.email || '',
          full_name: userFullName || user.email || '',
          last_seen: new Date().toISOString(),
        })
        console.log('✅ Presence updated for user:', user.id)
      } catch (error) {
        console.error('❌ Failed to update presence:', error)
      }
    }

    // Обработка событий присутствия
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState
        const userIds = new Set<string>()
        
        Object.values(state).forEach(presences => {
          presences.forEach(presence => {
            userIds.add(presence.user_id)
          })
        })
        
        console.log('📡 Online users synced:', Array.from(userIds))
        setOnlineUsers(userIds)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('👋 User joined:', key)
        setOnlineUsers(prev => new Set(prev).add(key))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('👋 User left:', key)
        setOnlineUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
      })
      .subscribe(async (status) => {
        console.log('🔗 Connection status:', status)
        if (status === 'SUBSCRIBED') {
          await updatePresence()
          setIsTracking(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsTracking(false)
        }
      })

    // Простой heartbeat каждые 30 секунд
    const heartbeat = setInterval(() => {
      if (!document.hidden && channel.state === 'joined') {
        updatePresence()
      }
    }, 30000)

    // Обновление при возврате в приложение
    const handleVisibilityChange = () => {
      if (!document.hidden && channel.state === 'joined') {
        console.log('👁️ App became visible - updating presence')
        updatePresence()
      }
    }

    const handleFocus = () => {
      if (channel.state === 'joined') {
        console.log('🎯 App focused - updating presence')
        updatePresence()
      }
    }

    const handlePageShow = () => {
      if (channel.state === 'joined') {
        console.log('📱 Page show - updating presence')
        setTimeout(() => updatePresence(), 1000) // Задержка для iOS Safari
      }
    }

    // Дополнительные обработчики для iOS Safari
    const handleTouch = () => {
      if (isIOSSafari && channel.state === 'joined') {
        updatePresence()
      }
    }

    // Добавляем обработчики
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    
    if (isIOSSafari) {
      document.addEventListener('touchstart', handleTouch, { passive: true })
    }

    // Cleanup
    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
      
      if (isIOSSafari) {
        document.removeEventListener('touchstart', handleTouch)
      }
      
      channel.unsubscribe()
      setIsTracking(false)
    }
  }, [user, userFullName, supabase, isIOSSafari])

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId)
  }

  return {
    onlineUsers,
    isUserOnline,
    isTracking,
  }
}
