'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

  // Функция для отправки присутствия
  const trackPresence = useCallback(async (channel: RealtimeChannel) => {
    if (!user?.id) return
    
    try {
      await channel.track({
        user_id: user.id,
        email: user.email || '',
        full_name: (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name || user.email || '',
        last_seen: new Date().toISOString(),
      })
      console.log('Tracking presence for user:', user.id)
    } catch (error) {
      console.error('Error tracking presence:', error)
    }
  }, [user])

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState
        const userIds = new Set<string>()
        
        Object.values(state).forEach(presences => {
          presences.forEach(presence => {
            userIds.add(presence.user_id)
          })
        })
        
        console.log('Presence sync - online users:', Array.from(userIds))
        setOnlineUsers(userIds)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
        // Обновляем состояние при присоединении пользователя
        if (newPresences && newPresences.length > 0) {
          setOnlineUsers(prev => {
            const updated = new Set(prev)
            newPresences.forEach((presence) => {
              const presenceData = presence as unknown as PresenceData
              updated.add(presenceData.user_id)
            })
            console.log('Updated after join:', Array.from(updated))
            return updated
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
        // Обновляем состояние при уходе пользователя
        if (leftPresences && leftPresences.length > 0) {
          setOnlineUsers(prev => {
            const updated = new Set(prev)
            leftPresences.forEach((presence) => {
              const presenceData = presence as unknown as PresenceData
              updated.delete(presenceData.user_id)
            })
            console.log('Updated after leave:', Array.from(updated))
            return updated
          })
        }
      })
      .subscribe(async (status) => {
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          await trackPresence(channel)
          setIsTracking(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsTracking(false)
        }
      })

    // Обработка изменения видимости страницы
    const handleVisibilityChange = () => {
      console.log('Visibility changed:', document.hidden)
      if (!document.hidden && channel.state === 'joined') {
        // Страница стала видимой - обновляем присутствие
        trackPresence(channel)
      }
    }

    // Обработка фокуса окна (для iOS Safari)
    const handleFocus = () => {
      console.log('Window focused')
      if (channel.state === 'joined') {
        trackPresence(channel)
      }
    }

    // Обработка возврата в приложение (для iOS Safari)
    const handlePageShow = (event: PageTransitionEvent) => {
      console.log('Page show event:', event.persisted)
      if (channel.state === 'joined') {
        trackPresence(channel)
      }
    }

    // Обработка восстановления соединения
    const handleOnline = () => {
      console.log('Connection restored')
      if (channel.state === 'joined') {
        trackPresence(channel)
      }
    }

    // Периодическое обновление присутствия (более частое для iOS Safari)
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden && navigator.onLine && channel.state === 'joined') {
        trackPresence(channel)
      }
    }, isIOSSafari ? 10000 : 15000) // 10 секунд для iOS Safari, 15 для остальных

    // Обработка касания (для iOS Safari)
    const handleTouch = () => {
      if (channel.state === 'joined' && isIOSSafari) {
        console.log('Touch detected on iOS Safari')
        trackPresence(channel)
      }
    }

    // Добавляем все обработчики событий
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('online', handleOnline)
    
    // Специальные обработчики для iOS Safari
    if (isIOSSafari) {
      document.addEventListener('touchstart', handleTouch, { passive: true })
    }

    return () => {
      clearInterval(heartbeatInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('online', handleOnline)
      
      if (isIOSSafari) {
        document.removeEventListener('touchstart', handleTouch)
      }
      
      channel.unsubscribe()
      setIsTracking(false)
    }
  }, [user, supabase, trackPresence, isIOSSafari])

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId)
  }

  return {
    onlineUsers,
    isUserOnline,
    isTracking,
  }
}
