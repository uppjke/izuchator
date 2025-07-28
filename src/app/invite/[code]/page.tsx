'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { UserPlus, Loader2, Users, GraduationCap } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { getInviteByCode, acceptInviteLink } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const ANIMATION_CONFIG = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
} as const

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
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
            inviterName: invite.creator_name || 'Неизвестный пользователь'
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
      <div className="min-h-[calc(100dvh-4.5rem)] bg-white flex items-center justify-center px-4">
        <motion.div 
          className="text-center"
          initial={ANIMATION_CONFIG.initial}
          animate={ANIMATION_CONFIG.animate}
          transition={ANIMATION_CONFIG.transition}
        >
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-600">Проверка приглашения...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100dvh-4.5rem)] bg-white flex items-center justify-center px-4">
        <motion.div 
          className="text-center max-w-md w-full"
          initial={ANIMATION_CONFIG.initial}
          animate={ANIMATION_CONFIG.animate}
          transition={ANIMATION_CONFIG.transition}
        >
          <div className="bg-red-50 border border-red-200 rounded-3xl p-8">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Ошибка</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <Button 
              onClick={() => router.push('/')}
              className="bg-zinc-900 hover:bg-zinc-700"
            >
              На главную
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!inviteData) {
    return null
  }

  // TODO: Проверить авторизацию пользователя
  const userAuthenticated = isAuthenticated // Используем из контекста

  const roleIcon = inviteData.type === 'student' ? GraduationCap : Users
  const roleText = inviteData.type === 'student' ? 'учеником' : 'преподавателем'
  
  // Проверяем совместимость ролей
  const isRoleCompatible = !user || !user.role || 
    (inviteData.type === 'student' && user.role === 'student') ||
    (inviteData.type === 'teacher' && user.role === 'teacher')
    
  const roleWarning = userAuthenticated && !isRoleCompatible
    ? `Это приглашение предназначено для ${inviteData.type === 'student' ? 'студентов' : 'преподавателей'}, а вы зарегистрированы как ${user?.role === 'student' ? 'студент' : 'преподаватель'}.`
    : null

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] bg-white flex items-center justify-center px-4">
      <motion.div 
        className="text-center max-w-md w-full"
        initial={ANIMATION_CONFIG.initial}
        animate={ANIMATION_CONFIG.animate}
        transition={ANIMATION_CONFIG.transition}
      >
        <motion.div 
          className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Icon icon={roleIcon} size="xl" className="mx-auto mb-6 text-zinc-700" />
          
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
            Приглашение
          </h1>
          
          <p className="text-zinc-600 mb-8">
            <span className="font-medium text-zinc-900">{inviteData.inviterName}</span> приглашает вас стать {roleText}
          </p>

          {roleWarning && (
            <motion.div
              className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm text-yellow-800">{roleWarning}</p>
            </motion.div>
          )}

          {userAuthenticated ? (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm text-zinc-500">
                {roleWarning 
                  ? 'Приглашение не может быть принято из-за несовместимости ролей'
                  : 'Нажмите кнопку ниже, чтобы принять приглашение'
                }
              </p>
              <Button 
                onClick={handleAcceptInvite} 
                disabled={loading || !!roleWarning}
                className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-300"
                size="lg"
              >
                <Icon icon={UserPlus} size="sm" className="mr-2" />
                {loading ? 'Принятие...' : 'Принять приглашение'}
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm text-zinc-500">
                Войдите в систему, чтобы принять приглашение
              </p>
              <Button 
                onClick={handleLogin} 
                className="w-full bg-zinc-900 hover:bg-zinc-700"
                size="lg"
              >
                Войти в систему
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
