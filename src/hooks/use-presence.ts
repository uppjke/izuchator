'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type PresenceState = {
  [key: string]: {
    user_id: string
    email: string
    full_name: string
    last_seen: string
  }[]
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [isTracking, setIsTracking] = useState(false)
  const { user } = useAuth()
  const supabase = createSupabaseBrowserClient()

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
        
        setOnlineUsers(userIds)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Отправляем присутствие пользователя
          await channel.track({
            user_id: user.id,
            email: user.email || '',
            full_name: (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name || user.email || '',
            last_seen: new Date().toISOString(),
          })
          setIsTracking(true)
        }
      })

    return () => {
      channel.unsubscribe()
      setIsTracking(false)
    }
  }, [user, supabase]) // Добавляем user как зависимость

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId)
  }

  return {
    onlineUsers,
    isUserOnline,
    isTracking,
  }
}
