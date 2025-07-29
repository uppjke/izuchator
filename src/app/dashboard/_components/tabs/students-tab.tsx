'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { InviteDialog } from '@/components/invite-dialog'
import { getTeacherStudents, removeTeacherStudentRelation } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { showCustomToast } from '@/lib/custom-toast'

type StudentRelation = {
  id: string
  student: {
    id: string
    email: string
    full_name: string
    role: string
  } | null
  status: string
  created_at: string
}

export function StudentsTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [students, setStudents] = useState<StudentRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  const handleInvite = () => {
    setInviteDialogOpen(true)
  }

  const handleRemoveStudent = async (relationId: string) => {
    setRemovingIds(prev => new Set(prev).add(relationId))
    
    try {
      const result = await removeTeacherStudentRelation(relationId)
      
      if (result.success) {
        setStudents(prev => prev.filter(s => s.id !== relationId))
        showCustomToast('Ученик успешно удален', '✅')
      } else {
        showCustomToast(result.message, '❌')
      }
    } catch {
      showCustomToast('Ошибка при удалении ученика', '❌')
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(relationId)
        return next
      })
    }
  }

  const getDisplayName = (student: StudentRelation['student']) => {
    if (!student) return 'Неизвестный ученик'
    return student.full_name || 'Ученик'
  }

  const getInitials = (student: StudentRelation['student']) => {
    if (!student) return '?'
    const name = student.full_name
    if (name && name !== student.email?.split('@')[0]) {
      return name.charAt(0).toUpperCase()
    }
    return student.email?.charAt(0).toUpperCase() || 'У'
  }

  useEffect(() => {
    const loadStudents = async () => {
      if (!user?.id) return
      
      try {
        const data = await getTeacherStudents(user.id)
        setStudents(data as unknown as StudentRelation[]) // API возвращает данные с JOIN
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
            <Icon icon={Plus} size="sm" />
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
      {/* Счетчик в левом верхнем углу */}
      <div className="absolute top-0 left-0">
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
          Учеников: {students.length}
        </div>
      </div>

      {/* Кнопка пригласить в правом углу */}
      <div className="absolute top-0 right-0">
        <Button onClick={handleInvite} className="flex items-center gap-2">
          <Icon icon={Plus} size="sm" />
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
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200"
            >
              {/* Аватар с инициалами */}
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full text-white font-medium text-lg">
                {getInitials(relation.student)}
              </div>
              
              {/* Информация о пользователе */}
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-lg">
                  {getDisplayName(relation.student)}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {relation.student?.email}
                </p>
              </div>
              
              {/* Кнопка удаления */}
              <Button
                variant="outline"
                size="icon"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleRemoveStudent(relation.id)}
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
        type="student"
      />
    </div>
  )
}
