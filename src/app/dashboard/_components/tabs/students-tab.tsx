'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { InviteDialog } from '@/components/invite-dialog'
import { getTeacherStudents, removeTeacherStudentRelation, updateCustomNameInRelation } from '@/lib/api'
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
  teacher_custom_name_for_student?: string | null
  student_custom_name_for_teacher?: string | null
}

export function StudentsTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [students, setStudents] = useState<StudentRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [updatingNameId, setUpdatingNameId] = useState<string | null>(null)
  const [showingOriginalId, setShowingOriginalId] = useState<string | null>(null)
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

  const getDisplayName = (student: StudentRelation['student'], relation: StudentRelation) => {
    if (!student) return 'Неизвестный ученик'
    
    // Если показываем оригинальное имя
    if (showingOriginalId === relation.id) {
      return student.full_name || 'Ученик'
    }
    
    // Если есть пользовательское имя от преподавателя
    if (relation.teacher_custom_name_for_student) {
      return relation.teacher_custom_name_for_student
    }
    
    // Иначе показываем оригинальное имя
    return student.full_name || 'Ученик'
  }

  const hasCustomName = (relation: StudentRelation) => {
    return !!relation.teacher_custom_name_for_student
  }

  const handleStartRename = (relation: StudentRelation) => {
    setEditingNameId(relation.id)
    setEditingName(relation.teacher_custom_name_for_student || relation.student?.full_name || '')
  }

  const handleSaveRename = async (relationId: string) => {
    if (!editingName.trim()) return

    setUpdatingNameId(relationId)
    
    try {
      const result = await updateCustomNameInRelation(relationId, editingName.trim(), true)
      
      if (result.success) {
        setStudents(prev => prev.map(s => 
          s.id === relationId 
            ? { ...s, teacher_custom_name_for_student: editingName.trim() }
            : s
        ))
        showCustomToast('Имя успешно обновлено', '✅')
      } else {
        showCustomToast(result.message, '❌')
      }
    } catch {
      showCustomToast('Ошибка при обновлении имени', '❌')
    } finally {
      setEditingNameId(null)
      setUpdatingNameId(null)
      setEditingName('')
    }
  }

  const handleCancelRename = () => {
    setEditingNameId(null)
    setEditingName('')
  }

  const handleNameClick = (relationId: string) => {
    if (hasCustomName(students.find(s => s.id === relationId)!)) {
      setShowingOriginalId(showingOriginalId === relationId ? null : relationId)
    }
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
              className="flex items-center gap-4 p-4 bg-zinc-50/80 rounded-xl border border-zinc-200/50"
            >
              {/* Аватар */}
              <UserAvatar 
                user={{
                  name: relation.student?.full_name,
                  email: relation.student?.email,
                  avatar_url: null // Пока null, потом добавим логику
                }}
                size="md"
              />
              
              {/* Информация о пользователе */}
              <div className="flex-1">
                {editingNameId === relation.id ? (
                  /* Режим редактирования */
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="text-lg font-medium"
                      placeholder="Введите имя"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(relation.id)
                        if (e.key === 'Escape') handleCancelRename()
                      }}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSaveRename(relation.id)}
                      disabled={updatingNameId === relation.id}
                      className="text-green-600 hover:text-green-700"
                    >
                      {updatingNameId === relation.id ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon icon={Check} size="sm" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelRename}
                      disabled={updatingNameId === relation.id}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      <Icon icon={X} size="sm" />
                    </Button>
                  </div>
                ) : (
                  /* Обычный режим */
                  <div className="flex items-center gap-2">
                    <h3 
                      className={`font-medium text-gray-900 text-lg ${
                        hasCustomName(relation) ? 'cursor-pointer hover:text-blue-600' : ''
                      }`}
                      onClick={() => handleNameClick(relation.id)}
                      title={hasCustomName(relation) ? 'Нажмите, чтобы показать оригинальное имя' : undefined}
                    >
                      {getDisplayName(relation.student, relation)}
                      {hasCustomName(relation) && showingOriginalId !== relation.id && (
                        <span className="ml-1 text-xs text-blue-500">*</span>
                      )}
                    </h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartRename(relation)}
                      className="text-gray-400 hover:text-gray-600 w-8 h-8"
                    >
                      <Icon icon={Edit3} size="xs" />
                    </Button>
                  </div>
                )}
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
