'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface InviteHandlerProps {
  onInviteFound: () => void
}

export function InviteHandler({ onInviteFound }: InviteHandlerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    const inviteCode = searchParams?.get('invite')
    const inviteType = searchParams?.get('type')
    
    if (inviteCode && inviteType) {
      // Сохраняем invite code в localStorage для использования после авторизации
      localStorage.setItem('pendingInvite', JSON.stringify({
        code: inviteCode,
        type: inviteType
      }))
      
      if (!isAuthenticated) {
        // Пользователь не авторизован - показываем диалог входа
        onInviteFound()
      } else {
        // Пользователь уже авторизован - перенаправляем на страницу приглашения
        router.push(`/invite/${inviteCode}`)
      }
    }
  }, [searchParams, onInviteFound, isAuthenticated, router])

  // Обрабатываем успешную авторизацию
  useEffect(() => {
    if (isAuthenticated && user) {
      const pendingInvite = localStorage.getItem('pendingInvite')
      if (pendingInvite) {
        try {
          const { code } = JSON.parse(pendingInvite)
          localStorage.removeItem('pendingInvite')
          router.push(`/invite/${code}`)
        } catch (error) {
          console.error('Error parsing pending invite:', error)
          localStorage.removeItem('pendingInvite')
        }
      }
    }
  }, [isAuthenticated, user, router])

  return null
}
