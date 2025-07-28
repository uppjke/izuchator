'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Loader2 } from 'lucide-react'
import { getInviteByCode, acceptInviteLink } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteData, setInviteData] = useState<{
    type: 'student' | 'teacher'
    inviterName: string
  } | null>(null)

  const inviteCode = params.code as string

  useEffect(() => {
    // Проверяем валидность приглашения
    const checkInvite = async () => {
      try {
        const result = await getInviteByCode(inviteCode)
        
        if (!result.success) {
          setError(result.message || 'Ошибка при проверке приглашения')
          return
        }
        
        if (result.invite) {
          const invite = result.invite
          setInviteData({
            type: invite.invite_type === 'teacher_to_student' ? 'student' : 'teacher',
            inviterName: invite.creatorName
          })
        }
      } catch {
        setError('Ошибка при проверке приглашения')
      } finally {
        setLoading(false)
      }
    }

    if (inviteCode) {
      checkInvite()
    }
  }, [inviteCode])

  const handleAcceptInvite = async () => {
    setLoading(true)
    try {
      const result = await acceptInviteLink(inviteCode)
      
      if (result.success) {
        // Перенаправляем в дашборд
        router.push('/dashboard')
      } else {
        setError(result.message)
      }
    } catch {
      setError('Ошибка при принятии приглашения')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    // Перенаправляем на страницу входа с параметром возврата
    const type = inviteData?.type || 'student'
    router.push(`/?invite=${inviteCode}&type=${type}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Проверка приглашения...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Ошибка</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!inviteData) {
    return null
  }

  // TODO: Проверить авторизацию пользователя
  const userAuthenticated = isAuthenticated // Используем из контекста

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserPlus className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <CardTitle>Приглашение</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>
            <strong>{inviteData.inviterName}</strong> приглашает вас стать{' '}
            {inviteData.type === 'student' ? 'учеником' : 'преподавателем'}
          </p>

          {userAuthenticated ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Нажмите кнопку ниже, чтобы принять приглашение
              </p>
              <Button 
                onClick={handleAcceptInvite} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Принятие...' : 'Принять приглашение'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Войдите в систему, чтобы принять приглашение
              </p>
              <Button onClick={handleLogin} className="w-full">
                Войти в систему
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
