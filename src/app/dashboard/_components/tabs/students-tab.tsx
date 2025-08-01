'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Trash2, Edit3, Check, X, RotateCcw, FileText, ChevronDown } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { InviteDialog } from '@/components/invite-dialog'
import { NotesDialog } from '@/components/notes-dialog'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { getTeacherStudents, removeTeacherStudentRelation, updateCustomNameInRelation } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

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
  teacher_notes?: string | null
  student_notes?: string | null
}

export function StudentsTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [students, setStudents] = useState<StudentRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [updatingNameId, setUpdatingNameId] = useState<string | null>(null)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [currentNotesRelation, setCurrentNotesRelation] = useState<StudentRelation | null>(null)
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<StudentRelation | null>(null)
  const editingRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)
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
        toast.success('Ученик успешно удален')
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Ошибка при удалении ученика')
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(relationId)
        return next
      })
      setConfirmDeleteOpen(false)
      setStudentToDelete(null)
    }
  }

  const handleDeleteClick = (relation: StudentRelation) => {
    setStudentToDelete(relation)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (studentToDelete) {
      handleRemoveStudent(studentToDelete.id)
    }
  }

  const getDisplayName = (student: StudentRelation['student'], relation: StudentRelation) => {
    if (!student) return 'Неизвестный ученик'
    
    // Если есть пользовательское имя от преподавателя, используем его
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
        toast.success('Имя успешно обновлено')
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Ошибка при обновлении имени')
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

  const handleResetToOriginal = async (relationId: string) => {
    setUpdatingNameId(relationId)
    
    try {
      const result = await updateCustomNameInRelation(relationId, '', true)
      
      if (result.success) {
        setStudents(prev => prev.map(s => 
          s.id === relationId 
            ? { ...s, teacher_custom_name_for_student: null }
            : s
        ))
        toast.success('Возвращено оригинальное имя')
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Ошибка при возврате имени')
    } finally {
      setEditingNameId(null)
      setUpdatingNameId(null)
      setEditingName('')
    }
  }

  // Обработчики заметок
  const handleToggleNotes = (relationId: string) => {
    setExpandedNotesId(prev => prev === relationId ? null : relationId)
  }

  const handleOpenNotes = (relation: StudentRelation) => {
    setCurrentNotesRelation(relation)
    setNotesDialogOpen(true)
  }

  const handleNotesUpdated = () => {
    // Обновляем данные студентов после сохранения заметки
    const loadStudents = async () => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        const result = await getTeacherStudents(user.id)
        setStudents(result as StudentRelation[])
        
        // Автоматически раскрываем блок заметок для текущей записи
        if (currentNotesRelation?.id) {
          setExpandedNotesId(currentNotesRelation.id)
        }
      } catch (error) {
        console.error('Error loading students:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadStudents()
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

  // Отслеживание кликов вне области заметок
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedNotesId && notesRef.current && !notesRef.current.contains(event.target as Node)) {
        // Проверяем, что клик не был по кнопке заметок
        const target = event.target as Element
        if (!target.closest('[data-notes-toggle]')) {
          setExpandedNotesId(null)
        }
      }
    }

    if (expandedNotesId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedNotesId])

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
            <div key={relation.id}>
              <motion.div
                className="flex flex-col bg-zinc-50/80 rounded-xl border border-zinc-200/50 min-w-0 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                duration: 0.2,
                ease: "easeOut"
              }}
            >
              {/* Основная часть карточки */}
              <div className="flex items-center gap-4 p-4 min-h-[100px] sm:min-h-[88px]">
              {/* Аватар - скрываем в режиме редактирования */}
              <AnimatePresence>
                {editingNameId !== relation.id && (
                  <motion.div 
                    className="flex-shrink-0"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.2,
                      ease: "easeOut"
                    }}
                  >
                    <UserAvatar 
                      user={{
                        name: relation.student?.full_name,
                        email: relation.student?.email,
                        avatar_url: null // Пока null, потом добавим логику
                      }}
                      size="md"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Информация о пользователе */}
              <div className="flex-1 min-w-0 h-[72px] sm:h-[60px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {editingNameId === relation.id ? (
                    /* Режим редактирования - только поле и кнопки */
                    <motion.div
                      key="editing"
                      ref={editingRef} 
                      className="flex items-center gap-2 w-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ 
                        duration: 0.2,
                        ease: "easeOut"
                      }}
                    >
                    <div className="flex-1 min-w-0">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="text-base sm:text-lg font-medium w-full"
                        placeholder="Введите имя"
                        maxLength={100}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(relation.id)
                          if (e.key === 'Escape') handleCancelRename()
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveRename(relation.id)}
                        disabled={updatingNameId === relation.id}
                        className="text-green-600 hover:text-green-700 h-8 w-8"
                      >
                        {updatingNameId === relation.id ? (
                          <motion.div 
                            className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                        ) : (
                          <Icon icon={Check} size="xs" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelRename}
                        disabled={updatingNameId === relation.id}
                        className="text-gray-600 hover:text-gray-700 h-8 w-8"
                      >
                        <Icon icon={X} size="xs" />
                      </Button>
                      {hasCustomName(relation) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleResetToOriginal(relation.id)
                          }}
                          disabled={updatingNameId === relation.id}
                          className="text-orange-500 hover:text-orange-600 h-8 w-8"
                          title="Вернуть оригинальное имя"
                        >
                          <Icon icon={RotateCcw} size="xs" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* Обычный режим */
                  <motion.div
                    key="normal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ 
                      duration: 0.2,
                      ease: "easeOut"
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {hasCustomName(relation) ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div 
                              className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors max-w-[280px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[450px] overflow-hidden"
                              title={getDisplayName(relation.student, relation)}
                            >
                              <h3 className="font-medium text-gray-900 text-base sm:text-lg truncate user-card-name flex-1 min-w-0">
                                {getDisplayName(relation.student, relation)}
                              </h3>
                              <span className="text-xs font-medium select-none flex-shrink-0 ml-1" style={{ color: '#3b82f6' }}>*</span>
                            </div>
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
                                }}>{relation.student?.full_name || 'Ученик'}</p>
                              </div>
                            </motion.div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <h3 
                          className="font-medium text-gray-900 text-base sm:text-lg truncate max-w-[280px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[450px] user-card-name"
                          title={getDisplayName(relation.student, relation)}
                        >
                          {getDisplayName(relation.student, relation)}
                        </h3>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartRename(relation)}
                        className="text-gray-400 hover:text-gray-600 w-6 h-6"
                      >
                        <Icon icon={Edit3} size="xs" />
                      </Button>
                    </div>
                    <p 
                      className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-1 truncate max-w-[380px] sm:max-w-[420px] md:max-w-[480px] lg:max-w-[550px] user-card-email" 
                      title={relation.student?.email}
                    >
                      {relation.student?.email}
                    </p>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
              
              {/* Кнопки действий */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Кнопки заметок и удаления - скрываем в режиме редактирования */}
                <AnimatePresence>
                  {editingNameId !== relation.id && (
                    <motion.div 
                      className="flex items-center gap-2"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ 
                        duration: 0.2,
                        ease: "easeOut"
                      }}
                    >
                      {/* Кнопка заметок */}
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 w-7 h-7"
                        onClick={() => handleOpenNotes(relation)}
                        title="Добавить заметку"
                        data-notes-toggle
                      >
                        <Icon icon={FileText} size="sm" />
                      </Button>

                      {/* Кнопка удаления */}
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 w-7 h-7"
                        onClick={() => handleDeleteClick(relation)}
                        disabled={removingIds.has(relation.id)}
                      >
                        {removingIds.has(relation.id) ? (
                          <motion.div 
                            className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                        ) : (
                          <Icon icon={Trash2} size="sm" />
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Кнопка шеврона для заметок - в самом правом углу */}
                <AnimatePresence>
                  {editingNameId !== relation.id && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ 
                        duration: 0.2,
                        ease: "easeOut"
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => handleToggleNotes(relation.id)}
                        data-notes-toggle
                      >
                        <Icon 
                          icon={ChevronDown} 
                          size="sm" 
                          className={`transition-transform duration-200 ${
                            expandedNotesId === relation.id ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>
              
              {/* Секция заметок внутри карточки */}
              <AnimatePresence>
                {expandedNotesId === relation.id && (
                  <motion.div
                    ref={notesRef}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ 
                      duration: 0.25, 
                      ease: [0.4, 0.0, 0.2, 1], // Более плавная кривая для мобильных
                      type: "tween" // Принудительно используем tween вместо spring
                    }}
                    className="overflow-hidden border-t border-zinc-200/50"
                    style={{
                      // Принудительно включаем аппаратное ускорение
                      transform: "translateZ(0)",
                      willChange: "height, opacity"
                    }}
                  >
                    <div className="px-4 py-3 bg-gray-50/80">
                      {relation.teacher_notes ? (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium text-gray-900 mb-1">Заметка:</p>
                          <p className="whitespace-pre-wrap">{relation.teacher_notes}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center">
                          Пусто.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        ))}
      </div>
    )}

    {/* Диалог заметок */}
    <NotesDialog
      open={notesDialogOpen}
      onOpenChange={setNotesDialogOpen}
      relationId={currentNotesRelation?.id || ''}
      currentNotes={currentNotesRelation?.teacher_notes || null}
      isTeacherUpdating={true}
      userName={currentNotesRelation?.student?.full_name || ''}
      onNotesUpdated={handleNotesUpdated}
    />

      {/* Диалог приглашения */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        type="student"
      />

      {/* Диалог подтверждения удаления */}
      <ConfirmationDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Удаление"
        description={`Вы уверены, что хотите удалить ${studentToDelete ? `**${getDisplayName(studentToDelete.student, studentToDelete)}**` : 'ученика'}?\nЭто действие нельзя отменить.`}
        confirmText="Удалить"
        onConfirm={handleConfirmDelete}
        isLoading={studentToDelete ? removingIds.has(studentToDelete.id) : false}
        variant="destructive"
      />
    </div>
  )
}
