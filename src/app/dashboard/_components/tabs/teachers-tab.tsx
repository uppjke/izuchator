'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, User, Mail } from 'lucide-react'
import { InviteDialog } from '@/components/invite-dialog'
import { getStudentTeachers } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type TeacherRelation = {
  id: string
  teacher: {
    id: string
    email: string
    display_name?: string
  } | null
  status: string
  created_at: string
}

export function TeachersTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [teachers, setTeachers] = useState<TeacherRelation[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const handleInvite = () => {
    setInviteDialogOpen(true)
  }

  useEffect(() => {
    const loadTeachers = async () => {
      if (!user?.id) return
      
      try {
        const data = await getStudentTeachers(user.id)
        setTeachers(data as any[]) // API возвращает данные с JOIN
      } catch (error) {
        console.error('Error loading teachers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTeachers()
  }, [user?.id])

  if (loading) {
    return (
      <div className="relative">
        <div className="absolute top-0 right-0">
          <Button onClick={handleInvite} className="flex items-center gap-2">
            <Plus className="!w-4 !h-4" />
            Пригласить
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <p>Загрузка преподавателей...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Кнопка пригласить в правом углу */}
      <div className="absolute top-0 right-0">
        <Button onClick={handleInvite} className="flex items-center gap-2">
          <Plus className="!w-4 !h-4" />
          Пригласить
        </Button>
      </div>

      {teachers.length === 0 ? (
        /* Центрированное сообщение если нет преподавателей */
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <p className="text-lg">У вас пока нет преподавателей</p>
            <p className="text-sm mt-1">Пригласите преподавателя или дождитесь приглашения</p>
          </div>
        </div>
      ) : (
        /* Список преподавателей */
        <div className="space-y-4 pt-16">
          {teachers.map((relation) => (
            <div
              key={relation.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {relation.teacher?.display_name || 'Преподаватель'}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Mail className="w-3 h-3" />
                  {relation.teacher?.email}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Добавлен {new Date(relation.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Диалог приглашения */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        type="teacher"
      />
    </div>
  )
}
