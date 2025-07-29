'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { InviteDialog } from '@/components/invite-dialog'
import { getStudentTeachers, removeTeacherStudentRelation } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { showCustomToast } from '@/lib/custom-toast'

type TeacherRelation = {
  id: string
  teacher: {
    id: string
    email: string
    display_name?: string
    name?: string
  } | null
  status: string
  created_at: string
}

export function TeachersTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [teachers, setTeachers] = useState<TeacherRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  const handleInvite = () => {
    setInviteDialogOpen(true)
  }

  const handleRemoveTeacher = async (relationId: string) => {
    setRemovingIds(prev => new Set(prev).add(relationId))
    
    try {
      const result = await removeTeacherStudentRelation(relationId)
      
      if (result.success) {
        setTeachers(prev => prev.filter(t => t.id !== relationId))
        showCustomToast('Преподаватель успешно удален', '✅')
      } else {
        showCustomToast(result.message, '❌')
      }
    } catch {
      showCustomToast('Ошибка при удалении преподавателя', '❌')
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(relationId)
        return next
      })
    }
  }

  const getDisplayName = (teacher: TeacherRelation['teacher']) => {
    if (!teacher) return 'Неизвестный преподаватель'
    return teacher.display_name || teacher.name || 'Преподаватель'
  }

  const getInitials = (teacher: TeacherRelation['teacher']) => {
    if (!teacher) return '?'
    const name = teacher.display_name || teacher.name
    if (name) {
      return name.charAt(0).toUpperCase()
    }
    return teacher.email.charAt(0).toUpperCase()
  }

  useEffect(() => {
    const loadTeachers = async () => {
      if (!user?.id) return
      
      try {
        const data = await getStudentTeachers(user.id)
        setTeachers(data as unknown as TeacherRelation[]) // API возвращает данные с JOIN
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
      {/* Счетчик в левом верхнем углу */}
      <div className="absolute top-0 left-0">
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          Преподавателей: {teachers.length}
        </div>
      </div>

      {/* Кнопка пригласить в правом углу */}
      <div className="absolute top-0 right-0">
        <Button onClick={handleInvite} className="flex items-center gap-2">
          <Icon icon={Plus} size="sm" />
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
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200"
            >
              {/* Аватар с инициалами */}
              <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-full text-white font-medium text-lg">
                {getInitials(relation.teacher)}
              </div>
              
              {/* Информация о пользователе */}
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-lg">
                  {getDisplayName(relation.teacher)}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {relation.teacher?.email}
                </p>
              </div>
              
              {/* Кнопка удаления */}
              <Button
                variant="outline"
                size="icon"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleRemoveTeacher(relation.id)}
                disabled={removingIds.has(relation.id)}
              >
                {removingIds.has(relation.id) ? (
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon icon={Trash2} size="sm" />
                )}
              </Button>
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
