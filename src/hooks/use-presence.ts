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
      if (!document.hidden && channel.state === 'joined') {
        // Страница стала видимой - обновляем присутствие
        trackPresence(channel)
      }
    }

    // Обработка восстановления соединения
    const handleOnline = () => {
      if (channel.state === 'joined') {
        trackPresence(channel)
      }
    }

    // Периодическое обновление присутствия (каждые 30 секунд)
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden && navigator.onLine && channel.state === 'joined') {
        trackPresence(channel)
      }
    }, 30000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      clearInterval(heartbeatInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      channel.unsubscribe()
      setIsTracking(false)
    }
  }, [user, supabase, trackPresence])

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId)
  }

  return {
    onlineUsers,
    isUserOnline,
    isTracking,
  }
}
