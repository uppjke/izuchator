"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Lesson } from './types'
import { Icon } from '@/components/ui/icon'
import { Clock, Calendar, User, Repeat, Trash2, AlertTriangle, ChevronDown, BadgeInfo, FileText, History, Check, X, Play, CalendarCheck, Pencil, Palette } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'
import { useQuery } from '@tanstack/react-query'
import { getLessonById, deleteLesson, updateLesson, type DeleteLessonScope } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LessonDetailsDialogProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function LessonDetailsDialog({ lesson, open, onOpenChange, onDeleted }: LessonDetailsDialogProps) {
  const { user } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [rescheduleMode, setRescheduleMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [newStart, setNewStart] = useState<string>('')
  const [newEnd, setNewEnd] = useState<string>('')
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState('')
  const queryClient = useQueryClient()

  // Получаем актуальные данные занятия из БД
  const { data: lessonData, isLoading } = useQuery({
    queryKey: ['lesson', lesson?.id],
    queryFn: () => lesson ? getLessonById(lesson.id) : null,
    enabled: Boolean(lesson?.id && open),
  })

  const currentLesson = lessonData?.lesson || lesson

  // Инициализация дат при входе в режим переноса
  React.useEffect(() => {
    if (rescheduleMode && currentLesson) {
      const fmt = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2,'0')
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      const start = new Date(currentLesson.startTime)
      const end = new Date(currentLesson.endTime)
      setNewStart(fmt(start))
      setNewEnd(fmt(end))
    }
  }, [rescheduleMode, currentLesson?.id, currentLesson?.startTime, currentLesson?.endTime, currentLesson])

  // Инициализация полей при входе в режим редактирования
  React.useEffect(() => {
    if (editMode && currentLesson) {
      setEditTitle(currentLesson.title || '')
      setEditDescription(currentLesson.description || '')
      setEditColor(currentLesson.labelColor || '#3b82f6')
    }
  }, [editMode, currentLesson])

  // Сброс режимов при закрытии диалога
  React.useEffect(() => {
    if (!open) {
      setEditMode(false)
      setRescheduleMode(false)
      setShowDeleteConfirm(false)
    }
  }, [open])

  // Проверяем, является ли пользователь преподавателем
  const isTeacher = user?.role === 'teacher'

  if (!currentLesson) return null

  // Получаем информацию об ученике из связи
  const relation = (currentLesson as { relation?: { teacherId?: string; studentId?: string; teacherName?: string; studentName?: string; teacher?: { name?: string; email?: string }; student?: { name?: string; email?: string } } }).relation
  let studentName = 'Ученик'
  let participantRole = 'Участник'
  
  if (relation) {
    // Определяем, кто текущий пользователь - преподаватель или ученик
    const isTeacher = relation.teacherId === user?.id
    
    if (isTeacher) {
      // Если текущий пользователь - преподаватель, показываем ученика
      studentName = relation.studentName || relation.student?.name || relation.student?.email || 'Ученик'
      participantRole = 'Ученик'
    } else {
      // Если текущий пользователь - ученик, показываем преподавателя
      studentName = relation.teacherName || relation.teacher?.name || relation.teacher?.email || 'Преподаватель'
      participantRole = 'Преподаватель'
    }
  }

  const start = new Date(currentLesson.startTime)
  const end = new Date(currentLesson.endTime)

  // Recurrence summary (current schema uses JSON field `recurrence`)
  let recurrenceSummary: string | null = null
  const rawRecurrence = (currentLesson as { recurrence?: unknown }).recurrence
  if (rawRecurrence) {
    try {
      const obj = typeof rawRecurrence === 'string' ? JSON.parse(rawRecurrence) : rawRecurrence
      if (obj && typeof obj === 'object' && 'weekdays' in obj && Array.isArray(obj.weekdays) && obj.weekdays.length) {
        const map: Record<number,string> = {0:'Вс',1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб'}
        const base = obj.weekdays.sort().map((d:number)=>map[d]).join(',')
        if (obj.end_type === 'until' && obj.end_date) recurrenceSummary = base + ' до ' + obj.end_date
        else if (obj.end_type === 'count' && obj.count) recurrenceSummary = base + ` (${obj.count} раз)`
        else recurrenceSummary = base
      }
    } catch { /* ignore parse errors */ }
  }

  // Correct recurring detection for current Prisma schema
  const isRecurring = Boolean((currentLesson as { isRecurring?: boolean }).isRecurring || rawRecurrence)

  // Маппинг статусов на человеко-понятные метки
  const statusMap: Record<string, string> = {
    scheduled: 'Запланировано',
    completed: 'Проведено', // изменено с "Завершено" по требованию
    cancelled: 'Отменено',
    confirmed: 'Подтверждено',
    in_progress: 'В процессе',
    rescheduled: 'Перенесено'
  }
  const rawStatus = (currentLesson as { status?: string }).status || 'scheduled'
  const statusLabel = statusMap[rawStatus] || rawStatus

  // Обработчик изменения статуса
  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateLesson({ id: currentLesson.id, status: newStatus })
      toast.success('Статус обновлен')
      await queryClient.invalidateQueries({ queryKey: ['lesson', currentLesson.id] })
      await queryClient.invalidateQueries({ queryKey: ['lessons'] })
    } catch {
      toast.error('Ошибка обновления статуса')
    }
  }

  // Обработчик сохранения редактирования
  const handleSaveEdit = async () => {
    try {
      if (!editTitle.trim()) {
        toast.error('Название не может быть пустым')
        return
      }
      await updateLesson({
        id: currentLesson.id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        labelColor: editColor,
      })
      toast.success('Урок обновлен')
      setEditMode(false)
      await queryClient.invalidateQueries({ queryKey: ['lesson', currentLesson.id] })
      await queryClient.invalidateQueries({ queryKey: ['lessons'] })
    } catch {
      toast.error('Ошибка сохранения')
    }
  }

  // Доступные действия для изменения статуса (в зависимости от текущего)
  const getStatusActions = () => {
    const actions: { status: string; label: string; icon: typeof Check; color: string }[] = []
    
    if (rawStatus !== 'confirmed' && rawStatus !== 'completed' && rawStatus !== 'cancelled') {
      actions.push({ status: 'confirmed', label: 'Подтвердить', icon: CalendarCheck, color: 'text-emerald-600' })
    }
    if (rawStatus !== 'in_progress' && rawStatus !== 'completed' && rawStatus !== 'cancelled') {
      actions.push({ status: 'in_progress', label: 'Начать', icon: Play, color: 'text-orange-600' })
    }
    if (rawStatus !== 'completed' && rawStatus !== 'cancelled') {
      actions.push({ status: 'completed', label: 'Завершить', icon: Check, color: 'text-green-600' })
    }
    if (rawStatus !== 'cancelled' && rawStatus !== 'completed') {
      actions.push({ status: 'cancelled', label: 'Отменить', icon: X, color: 'text-red-600' })
    }
    if (rawStatus === 'cancelled' || rawStatus === 'completed') {
      actions.push({ status: 'scheduled', label: 'Восстановить', icon: CalendarCheck, color: 'text-blue-600' })
    }
    
    return actions
  }

  // Ограниченное описание
  const limitedDescription = currentLesson.description
    ? (currentLesson.description.length > 250
        ? currentLesson.description.slice(0, 247).trimEnd() + '…'
        : currentLesson.description)
    : null

  const handleDelete = async (scope: DeleteLessonScope = 'single') => {
    try {
      const res = await deleteLesson(currentLesson.id, scope)
      let msg = 'Урок удален'
      if (res?.deleted && res.deleted > 1) {
        msg = `${res.deleted} занятий удалено`
      }
      toast.success(msg)
      onDeleted?.()
      onOpenChange(false)
    } catch {
      toast.error('Ошибка при удалении занятия')
    }
    setShowDeleteConfirm(false)
  }

  const infoRow = (icon: LucideIcon, label: string, value: React.ReactNode): React.ReactElement => (
    <div className="flex items-start gap-3 text-sm">
      <div className="mt-0.5 text-muted-foreground"><Icon icon={icon} size="xs" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-foreground break-words">{value || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  )

  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon={AlertTriangle} className="text-red-500" size="sm" />
              Удалить занятие
            </DialogTitle>
            <DialogDescription>
              {isRecurring 
                ? 'Это занятие является частью серии повторяющихся занятий. Выберите, что удалить:'
                : 'Вы уверены, что хотите удалить это занятие?'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 w-full">
            <div className="p-4 border rounded-xl bg-gray-50 w-full max-w-full overflow-hidden">
              <div className="font-medium truncate" title={currentLesson.title}>{currentLesson.title}</div>
              <div className="text-sm text-gray-600 truncate">
                {format(start, 'd MMMM yyyy, HH:mm', { locale: ru })} – {studentName}
              </div>
            </div>
          </div>
          <DialogFooter className="w-full gap-3 pt-2 flex flex-col sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="w-full sm:w-auto">Отмена</Button>
            {isRecurring ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto flex items-center gap-1 text-white">
                    Удалить
                    <Icon icon={ChevronDown} size="xs" className="text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleDelete('single')} className="cursor-pointer">
                    Только это занятие
                  </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete('weekday')} className="cursor-pointer">
                    Все по этому дню недели
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete('all_future_student')} className="cursor-pointer text-red-600 focus:text-red-600">
                    Все занятия этого ученика
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
        <Button variant="destructive" onClick={() => handleDelete('single')} className="w-full sm:w-auto text-white flex items-center gap-1">
                <Icon icon={Trash2} size="xs" className="text-white" />
                Удалить
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full focus:outline-none">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-semibold text-center">
            {editMode ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-center text-xl font-semibold"
                placeholder="Название урока"
              />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="truncate" style={currentLesson.labelColor ? { color: currentLesson.labelColor } : undefined}>
                  {currentLesson.title}
                </span>
                {isTeacher && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditMode(true)}
                  >
                    <Icon icon={Pencil} size="xs" />
                  </Button>
                )}
              </div>
            )}
            {isLoading && <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mt-2" />}
          </DialogTitle>
          <DialogDescription className="text-center">
            {editMode ? 'Редактирование занятия' : 'Полная информация о занятии'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Режим редактирования */}
        {editMode && isTeacher ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Описание</Label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full min-h-[80px] text-sm rounded-lg border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:border-blue-500 transition resize-none"
                placeholder="Краткое описание урока"
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Icon icon={Palette} size="xs" />
                Цвет метки
              </Label>
              <div className="flex flex-wrap gap-2">
                {['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#0ea5e9', '#84cc16', '#9333ea', '#64748b'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${editColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>Отмена</Button>
              <Button onClick={handleSaveEdit}>Сохранить</Button>
            </div>
          </div>
        ) : (
          /* Режим просмотра */
          <div className="space-y-5 py-2">
          {infoRow(User, participantRole, studentName)}
          <div className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 text-muted-foreground"><Icon icon={Calendar} size="xs" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Дата</div>
              {!rescheduleMode && (
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-foreground">
                  <span className="break-words">
                    {(() => { const weekdayShort = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][start.getDay()]; return `${format(start, 'd MMMM yyyy', { locale: ru })} (${weekdayShort})`; })()}
                  </span>
                  {isTeacher && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setRescheduleMode(true)} className="h-7 px-2">
                      Перенести
                    </Button>
                  )}
                </div>
              )}
              {rescheduleMode && isTeacher && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Начало</label>
                      <input type="datetime-local" value={newStart} onChange={e=>setNewStart(e.target.value)} className="w-full rounded-md border px-2 py-1 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Конец</label>
                      <input type="datetime-local" value={newEnd} onChange={e=>setNewEnd(e.target.value)} className="w-full rounded-md border px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={()=>setRescheduleMode(false)}>Отмена</Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        try {
                          if (!newStart || !newEnd) return
                          const s = new Date(newStart)
                          const e = new Date(newEnd)
                          if (e <= s) { toast.error('Конец раньше начала'); return }
                          const diffH = (e.getTime()-s.getTime())/36e5
                          if (diffH > 12) { toast.error('Длительность > 12 часов'); return }
                          await updateLesson({ id: currentLesson.id, startTime: s, endTime: e })
                          toast.success('Занятие перенесено')
                          setRescheduleMode(false)
                          await queryClient.invalidateQueries({ queryKey: ['lesson', currentLesson.id] })
                          await queryClient.invalidateQueries({ queryKey: ['lessons'] })
                        } catch {
                          toast.error('Ошибка переноса')
                        }
                      }}
                    >Сохранить</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {infoRow(Clock, 'Время', `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`)}
          {recurrenceSummary && infoRow(Repeat, 'Повтор', recurrenceSummary)}
          {infoRow(BadgeInfo, 'Статус', (
            <div className="flex flex-col gap-2">
              <span className="relative group inline-flex items-center gap-1">
                {statusLabel}
                {rawStatus === 'rescheduled' && (currentLesson as { previousStartTime?: string }).previousStartTime && (
                  <span className="inline-flex items-center">
                    <Icon icon={History} size="xs" />
                    <span className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white">
                      Было: {format(new Date((currentLesson as { previousStartTime?: string }).previousStartTime!), 'd MMM yyyy HH:mm', { locale: ru })}
                      {(currentLesson as { previousEndTime?: string }).previousEndTime && ` – ${format(new Date((currentLesson as { previousEndTime?: string }).previousEndTime!), 'HH:mm', { locale: ru })}`}
                    </span>
                  </span>
                )}
              </span>
              {/* Кнопки изменения статуса */}
              {isTeacher && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {getStatusActions().map(action => (
                    <Button
                      key={action.status}
                      variant="outline"
                      size="sm"
                      className={`h-7 px-2 text-xs ${action.color} hover:${action.color}`}
                      onClick={() => handleStatusChange(action.status)}
                    >
                      <Icon icon={action.icon} size="xs" className="mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {infoRow(FileText, 'Описание', limitedDescription || '—')}
        </div>
        )}
        
        {!editMode && (
        <DialogFooter>
          {isTeacher && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-white"
            >
              <Icon icon={Trash2} size="xs" className="text-white" />
              Удалить
            </Button>
          )}
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
