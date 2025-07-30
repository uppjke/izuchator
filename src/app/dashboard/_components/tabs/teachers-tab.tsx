'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Trash2, Edit3, Check, X, RotateCcw } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { InviteDialog } from '@/components/invite-dialog'
import { getStudentTeachers, removeTeacherStudentRelation, updateCustomNameInRelation } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { showCustomToast } from '@/lib/custom-toast'

type TeacherRelation = {
  id: string
  teacher: {
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

export function TeachersTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [teachers, setTeachers] = useState<TeacherRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [updatingNameId, setUpdatingNameId] = useState<string | null>(null)
  const editingRef = useRef<HTMLDivElement>(null)
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

  const getDisplayName = (teacher: TeacherRelation['teacher'], relation: TeacherRelation) => {
    if (!teacher) return 'Неизвестный преподаватель'
    
    // Если есть пользовательское имя от ученика, используем его
    if (relation.student_custom_name_for_teacher) {
      return relation.student_custom_name_for_teacher
    }
    
    // Иначе показываем оригинальное имя
    return teacher.full_name || 'Преподаватель'
  }

  const hasCustomName = (relation: TeacherRelation) => {
    return !!relation.student_custom_name_for_teacher
  }

  const handleStartRename = (relation: TeacherRelation) => {
    setEditingNameId(relation.id)
    setEditingName(relation.student_custom_name_for_teacher || relation.teacher?.full_name || '')
  }

  const handleSaveRename = async (relationId: string) => {
    if (!editingName.trim()) return

    setUpdatingNameId(relationId)
    
    try {
      const result = await updateCustomNameInRelation(relationId, editingName.trim(), false)
      
      if (result.success) {
        setTeachers(prev => prev.map(t => 
          t.id === relationId 
            ? { ...t, student_custom_name_for_teacher: editingName.trim() }
            : t
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

  const handleResetToOriginal = async (relationId: string, originalName: string) => {
    setUpdatingNameId(relationId)
    
    try {
      // Передаем пустую строку для сброса к null
      const result = await updateCustomNameInRelation(relationId, '', false)
      
      if (result.success) {
        setTeachers(prev => prev.map(t => 
          t.id === relationId 
            ? { ...t, student_custom_name_for_teacher: null }
            : t
        ))
        showCustomToast('Возвращено оригинальное имя', '✅')
      } else {
        showCustomToast(result.message, '❌')
      }
    } catch (error) {
      showCustomToast('Ошибка при возврате имени', '❌')
    } finally {
      setEditingNameId(null)
      setUpdatingNameId(null)
      setEditingName('')
    }
  }

  // Отслеживание кликов вне области редактирования
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingNameId && editingRef.current && !editingRef.current.contains(event.target as Node)) {
        handleCancelRename()
      }
    }

    if (editingNameId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingNameId])

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
            <Icon icon={Plus} size="sm" />
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
          {teachers.map((relation, index) => (
            <motion.div
              key={relation.id}
              className="flex items-center gap-4 p-4 bg-zinc-50/80 rounded-xl border border-zinc-200/50 min-w-0"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
              whileHover={{ 
                scale: 1.01,
                transition: { duration: 0.2 }
              }}
            >
              {/* Аватар */}
              <div className="flex-shrink-0">
                <UserAvatar 
                  user={{
                    name: relation.teacher?.full_name,
                    email: relation.teacher?.email,
                    avatar_url: null // Пока null, потом добавим логику
                  }}
                  size="md"
                />
              </div>
              
              {/* Информация о пользователе */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {editingNameId === relation.id ? (
                    /* Режим редактирования */
                    <motion.div 
                      ref={editingRef} 
                      key="editing"
                      className="flex flex-col sm:flex-row sm:items-center gap-2"
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05, duration: 0.2 }}
                      >
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="text-lg font-medium w-full sm:w-48 md:w-56 lg:w-64 xl:w-72"
                          placeholder="Введите имя"
                          maxLength={100}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(relation.id)
                            if (e.key === 'Escape') handleCancelRename()
                          }}
                          autoFocus
                        />
                      </motion.div>
                      <motion.div 
                        className="flex items-center gap-1 sm:gap-2 justify-end sm:justify-start"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSaveRename(relation.id)}
                            disabled={updatingNameId === relation.id}
                            className="text-green-600 hover:text-green-700 h-8 w-8 sm:h-10 sm:w-10"
                          >
                            {updatingNameId === relation.id ? (
                              <motion.div 
                                className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-green-600 border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                            ) : (
                              <Icon icon={Check} size="xs" className="sm:hidden" />
                            )}
                            {updatingNameId !== relation.id && (
                              <Icon icon={Check} size="sm" className="hidden sm:block" />
                            )}
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleCancelRename}
                            disabled={updatingNameId === relation.id}
                            className="text-gray-600 hover:text-gray-700 h-8 w-8 sm:h-10 sm:w-10"
                          >
                            <Icon icon={X} size="xs" className="sm:hidden" />
                            <Icon icon={X} size="sm" className="hidden sm:block" />
                          </Button>
                        </motion.div>
                        {hasCustomName(relation) && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15, duration: 0.2 }}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleResetToOriginal(relation.id, relation.teacher?.full_name || '')
                              }}
                              disabled={updatingNameId === relation.id}
                              className="text-orange-500 hover:text-orange-600 h-8 w-8 sm:h-10 sm:w-10"
                              title="Вернуть оригинальное имя"
                            >
                              <Icon icon={RotateCcw} size="xs" className="sm:hidden" />
                              <Icon icon={RotateCcw} size="sm" className="hidden sm:block" />
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
                    </motion.div>
                  ) : (
                    /* Обычный режим */
                    <motion.div 
                      key="normal"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {hasCustomName(relation) ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <motion.div 
                              className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[350px] overflow-hidden"
                              title={getDisplayName(relation.teacher, relation)}
                            >
                              <h3 className="font-medium text-gray-900 text-lg truncate user-card-name flex-1 min-w-0">
                                {getDisplayName(relation.teacher, relation)}
                              </h3>
                              <span className="text-xs font-medium select-none flex-shrink-0 ml-1" style={{ color: '#3b82f6' }}>*</span>
                            </motion.div>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto max-w-[280px] sm:max-w-[300px] p-0 bg-transparent border-0 shadow-none" side="bottom" align="start">
                            <motion.div
                              className="p-3 bg-white border border-gray-200 shadow-lg rounded-lg"
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                              <div className="text-sm">
                                <p className="text-gray-500 mb-1">Оригинальное имя:</p>
                                <p className="font-medium text-gray-900" style={{ 
                                  wordBreak: 'break-all', 
                                  overflowWrap: 'break-word', 
                                  whiteSpace: 'normal',
                                  hyphens: 'auto',
                                  lineBreak: 'anywhere'
                                }}>{relation.teacher?.full_name || 'Преподаватель'}</p>
                              </div>
                            </motion.div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <motion.h3 
                          className="font-medium text-gray-900 text-lg truncate max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[350px] user-card-name"
                          title={getDisplayName(relation.teacher, relation)}
                        >
                          {getDisplayName(relation.teacher, relation)}
                        </motion.h3>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartRename(relation)}
                          className="text-gray-400 hover:text-gray-600 w-8 h-8"
                        >
                          <Icon icon={Edit3} size="xs" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-sm text-gray-500 mt-1 truncate max-w-[300px] sm:max-w-[350px] md:max-w-[400px] user-card-email" title={relation.teacher?.email}>
                  {relation.teacher?.email}
                </p>
              </div>
              
              {/* Кнопка удаления */}
              <div className="flex-shrink-0">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveTeacher(relation.id)}
                    disabled={removingIds.has(relation.id)}
                  >
                    {removingIds.has(relation.id) ? (
                      <motion.div 
                        className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Icon icon={Trash2} size="sm" />
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
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
