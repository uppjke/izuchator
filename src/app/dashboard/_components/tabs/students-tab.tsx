'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, User, Mail } from 'lucide-react'
import { InviteDialog } from '@/components/invite-dialog'
import { getTeacherStudents } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type StudentRelation = {
  id: string
  student: {
    id: string
    email: string
    display_name?: string
  } | null
  status: string
  created_at: string
}

export function StudentsTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [students, setStudents] = useState<StudentRelation[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const handleInvite = () => {
    setInviteDialogOpen(true)
  }

  useEffect(() => {
    const loadStudents = async () => {
      if (!user?.id) return
      
      try {
        const data = await getTeacherStudents(user.id)
        setStudents(data as any[]) // API возвращает данные с JOIN
      } catch (error) {
        console.error('Error loading students:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
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
            <p>Загрузка учеников...</p>
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

      {students.length === 0 ? (
        /* Центрированное сообщение если нет учеников */
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <p className="text-lg">У вас пока нет учеников</p>
            <p className="text-sm mt-1">Пригласите ученика или дождитесь приглашения</p>
          </div>
        </div>
      ) : (
        /* Список учеников */
        <div className="space-y-4 pt-16">
          {students.map((relation) => (
            <div
              key={relation.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {relation.student?.display_name || 'Студент'}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Mail className="w-3 h-3" />
                  {relation.student?.email}
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
        type="student"
      />
    </div>
  )
}
