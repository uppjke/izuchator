"use client"
import React, { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Lesson } from './types'
import { Icon } from '@/components/ui/icon'
import {
  Calendar, Trash2, AlertTriangle, MoreHorizontal, ChevronDown,
  History, Check, X, Play, CalendarCheck, Pencil,
  LayoutDashboard, Unlink, Loader2,
  ChevronRight, ExternalLink
} from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'
import { useQuery } from '@tanstack/react-query'
import { getLessonById, deleteLesson, updateLesson, getBoards, generateBoardForLesson, type DeleteLessonScope, type BoardListItem } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [rescheduleMode, setRescheduleMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [boardPickerOpen, setBoardPickerOpen] = useState(false)
  const [generatingBoard, setGeneratingBoard] = useState(false)
  const autoGenerateTriggered = useRef<string | null>(null)
  const [newStart, setNewStart] = useState<string>('')
  const [newEnd, setNewEnd] = useState<string>('')
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState('')
  const queryClient = useQueryClient()

  const { data: lessonData, isLoading } = useQuery({
    queryKey: ['lesson', lesson?.id],
    queryFn: () => lesson ? getLessonById(lesson.id) : null,
    enabled: Boolean(lesson?.id && open),
  })

  const { data: boards = [] } = useQuery<BoardListItem[]>({
    queryKey: ['boards'],
    queryFn: getBoards,
    enabled: Boolean(open && user?.role === 'teacher'),
    staleTime: 1000 * 60 * 5,
  })

  const currentLesson = lessonData?.lesson || lesson

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

  React.useEffect(() => {
    if (editMode && currentLesson) {
      setEditTitle(currentLesson.title || '')
      setEditDescription(currentLesson.description || '')
      setEditColor(currentLesson.labelColor || '#3b82f6')
    }
  }, [editMode, currentLesson])

  React.useEffect(() => {
    if (!open) {
      setEditMode(false)
      setRescheduleMode(false)
      setShowDeleteConfirm(false)
      setBoardPickerOpen(false)
      setGeneratingBoard(false)
    }
  }, [open])

  const handleGenerateBoard = useCallback(async (lessonId: string) => {
    if (generatingBoard) return
    setGeneratingBoard(true)
    try {
      const result = await generateBoardForLesson(lessonId)
      if (result.created) {
        toast.success('Доска создана автоматически')
      }
      await queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] })
      await queryClient.invalidateQueries({ queryKey: ['lessons'] })
      await queryClient.invalidateQueries({ queryKey: ['boards'] })
    } catch {
      toast.error('Не удалось создать доску')
    } finally {
      setGeneratingBoard(false)
    }
  }, [generatingBoard, queryClient])

  // Auto-generate board 5 minutes before lesson starts
  const isTeacher = user?.role === 'teacher'
  React.useEffect(() => {
    if (!open || !currentLesson || !isTeacher) return
    if (currentLesson.boardId || currentLesson.board) return
    if (autoGenerateTriggered.current === currentLesson.id) return

    const startTime = new Date(currentLesson.startTime).getTime()
    const now = Date.now()
    const minutesBefore = (startTime - now) / 60000

    // Auto-generate if within 5 minutes of start or already started (but not more than 2 hours past)
    if (minutesBefore <= 5 && minutesBefore > -120) {
      autoGenerateTriggered.current = currentLesson.id
      handleGenerateBoard(currentLesson.id)
    }
  }, [open, currentLesson?.id, currentLesson?.boardId, currentLesson?.board, isTeacher, handleGenerateBoard, currentLesson])

  if (!currentLesson) return null

  const relation = (currentLesson as { relation?: { id?: string; teacherId?: string; studentId?: string; teacherName?: string; studentName?: string; teacher?: { name?: string; email?: string; image?: string | null }; student?: { name?: string; email?: string; image?: string | null } } }).relation
  let participantName = 'Участник'
  let participantRole = 'Участник'
  let participantUser: { name?: string; email?: string; avatar_url?: string | null } | null = null
  
  if (relation) {
    const isCurrentTeacher = relation.teacherId === user?.id
    if (isCurrentTeacher) {
      participantName = relation.studentName || relation.student?.name || relation.student?.email || 'Ученик'
      participantRole = 'Ученик'
      participantUser = { name: participantName, email: relation.student?.email, avatar_url: relation.student?.image }
    } else {
      participantName = relation.teacherName || relation.teacher?.name || relation.teacher?.email || 'Преподаватель'
      participantRole = 'Преподаватель'
      participantUser = { name: participantName, email: relation.teacher?.email, avatar_url: relation.teacher?.image }
    }
  }

  const start = new Date(currentLesson.startTime)
  const end = new Date(currentLesson.endTime)
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000)

  let recurrenceSummary: string | null = null
  const rawRecurrence = (currentLesson as { recurrence?: unknown }).recurrence
  if (rawRecurrence) {
    try {
      const obj = typeof rawRecurrence === 'string' ? JSON.parse(rawRecurrence) : rawRecurrence
      if (obj && typeof obj === 'object' && 'weekdays' in obj && Array.isArray(obj.weekdays) && obj.weekdays.length) {
        const map: Record<number,string> = {0:'Вс',1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб'}
        const base = obj.weekdays.sort().map((d:number)=>map[d]).join(', ')
        if (obj.end_type === 'until' && obj.end_date) recurrenceSummary = base + ' до ' + obj.end_date
        else if (obj.end_type === 'count' && obj.count) recurrenceSummary = base + ` (${obj.count} раз)`
        else recurrenceSummary = base
      }
    } catch { /* ignore */ }
  }

  const isRecurring = Boolean((currentLesson as { isRecurring?: boolean }).isRecurring || rawRecurrence)

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    scheduled: { label: 'Запланировано', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    completed: { label: 'Проведено', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    cancelled: { label: 'Отменено', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    confirmed: { label: 'Подтверждено', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    in_progress: { label: 'В процессе', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    rescheduled: { label: 'Перенесено', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  }
  const rawStatus = (currentLesson as { status?: string }).status || 'scheduled'
  const status = statusConfig[rawStatus] || { label: rawStatus, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' }

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

  const handleSaveEdit = async () => {
    try {
      if (!editTitle.trim()) { toast.error('Название не может быть пустым'); return }
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

  const handleBoardChange = async (boardId: string | null) => {
    try {
      await updateLesson({ id: currentLesson.id, boardId: boardId || undefined })
      toast.success(boardId ? 'Доска привязана' : 'Доска отвязана')
      setBoardPickerOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['lesson', currentLesson.id] })
      await queryClient.invalidateQueries({ queryKey: ['lessons'] })
    } catch {
      toast.error('Ошибка обновления доски')
    }
  }

  const getStatusActions = () => {
    const actions: { status: string; label: string; icon: typeof Check; color: string }[] = []
    if (rawStatus !== 'confirmed' && rawStatus !== 'completed' && rawStatus !== 'cancelled')
      actions.push({ status: 'confirmed', label: 'Подтвердить', icon: CalendarCheck, color: 'text-emerald-600' })
    if (rawStatus !== 'in_progress' && rawStatus !== 'completed' && rawStatus !== 'cancelled')
      actions.push({ status: 'in_progress', label: 'Начать', icon: Play, color: 'text-orange-600' })
    if (rawStatus !== 'completed' && rawStatus !== 'cancelled')
      actions.push({ status: 'completed', label: 'Завершить', icon: Check, color: 'text-green-600' })
    if (rawStatus !== 'cancelled' && rawStatus !== 'completed')
      actions.push({ status: 'cancelled', label: 'Отменить', icon: X, color: 'text-red-600' })
    if (rawStatus === 'cancelled' || rawStatus === 'completed')
      actions.push({ status: 'scheduled', label: 'Восстановить', icon: CalendarCheck, color: 'text-blue-600' })
    return actions
  }

  const limitedDescription = currentLesson.description
    ? (currentLesson.description.length > 250 ? currentLesson.description.slice(0, 247).trimEnd() + '\u2026' : currentLesson.description)
    : null

  const handleDelete = async (scope: DeleteLessonScope = 'single') => {
    try {
      const res = await deleteLesson(currentLesson.id, scope)
      let msg = 'Урок удален'
      if (res?.deleted && res.deleted > 1) msg = `${res.deleted} занятий удалено`
      toast.success(msg)
      onDeleted?.()
      onOpenChange(false)
    } catch {
      toast.error('Ошибка при удалении занятия')
    }
    setShowDeleteConfirm(false)
  }

  const availableBoards = boards.filter(b => !b.relationId || b.relationId === relation?.id)
  const currentBoard = currentLesson.board

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
                ? 'Это занятие является частью серии. Выберите, что удалить:'
                : 'Вы уверены, что хотите удалить это занятие?'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 w-full">
            <div className="p-4 border rounded-xl bg-gray-50 w-full max-w-full overflow-hidden">
              <div className="font-medium truncate" title={currentLesson.title}>{currentLesson.title}</div>
              <div className="text-sm text-gray-600 truncate">
                {format(start, 'd MMMM yyyy, HH:mm', { locale: ru })} – {participantName}
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

  const labelColor = currentLesson.labelColor || '#3b82f6'

  // Capitalize first letter of weekday from date-fns
  const weekday = format(start, 'EEEE', { locale: ru })
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md p-0 flex flex-col max-h-[90vh] focus:outline-none">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <div className="flex justify-center mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: labelColor }} />
          </div>
          <DialogTitle className="text-center text-2xl font-semibold">
            {editMode ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold h-9 text-center"
                placeholder="Название"
              />
            ) : (
              currentLesson.title
            )}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {!editMode && (
              <>
                {status.label}
                {isLoading && <span className="inline-block w-3 h-3 ml-1.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin align-middle" />}
              </>
            )}
            {editMode && 'Редактирование занятия'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          {editMode && isTeacher ? (
            /* ── Edit mode ── */
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Описание</Label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full min-h-[96px] text-sm rounded-2xl border border-input bg-transparent px-4 py-3 focus-visible:outline-none focus-visible:border-blue-500 transition resize-none"
                  placeholder="Краткое примечание к занятию"
                  maxLength={300}
                />
              </div>
              <div className="space-y-2">
                <Label>Цвет метки</Label>
                <div className="flex flex-wrap gap-2">
                  {['#3b82f6','#6366f1','#10b981','#f59e0b','#ef4444','#ec4899','#0ea5e9','#84cc16','#9333ea','#64748b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${editColor === c ? 'border-foreground scale-110 shadow-sm' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Дата</Label>
                <div className="text-sm">{weekdayCap}, {format(start, 'd MMMM', { locale: ru })}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 grid-cols-1">
                <div className="space-y-2">
                  <Label>Время</Label>
                  <div className="text-sm">{format(start, 'HH:mm')} – {format(end, 'HH:mm')}</div>
                </div>
                <div className="space-y-2">
                  <Label>Длительность</Label>
                  <div className="text-sm">{durationMin} мин</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{participantRole}</Label>
                <div className="flex items-center gap-3">
                  <UserAvatar user={participantUser} size="xs" />
                  <span className="text-sm">{participantName}</span>
                </div>
              </div>
              {recurrenceSummary && (
                <div className="space-y-2">
                  <Label>Повторение</Label>
                  <div className="text-sm">{recurrenceSummary}</div>
                </div>
              )}
              {limitedDescription && (
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <div className="text-sm text-muted-foreground leading-relaxed">{limitedDescription}</div>
                </div>
              )}

              {/* Rescheduled notice */}
              {rawStatus === 'rescheduled' && (currentLesson as { previousStartTime?: string }).previousStartTime && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2.5 text-sm text-amber-700">
                  <Icon icon={History} size="sm" className="shrink-0 text-amber-500" />
                  <span>
                    {'Перенесено с '}
                    {format(new Date((currentLesson as { previousStartTime?: string }).previousStartTime!), 'd MMM HH:mm', { locale: ru })}
                    {(currentLesson as { previousEndTime?: string }).previousEndTime &&
                      ` – ${format(new Date((currentLesson as { previousEndTime?: string }).previousEndTime!), 'HH:mm')}`
                    }
                  </span>
                </div>
              )}

              {/* Board */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Доска
                  {!currentBoard && !isTeacher && (
                    <span className="text-xs text-muted-foreground font-normal">не привязана</span>
                  )}
                </Label>
                {boardPickerOpen && isTeacher ? (
                  <div className="space-y-2">
                    <Select
                      value={currentBoard?.id || ''}
                      onValueChange={(v) => {
                        if (v === '__none__') handleBoardChange(null)
                        else handleBoardChange(v)
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-full">
                        <SelectValue placeholder="Выберите доску" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Icon icon={Unlink} size="xs" />
                            Без доски
                          </span>
                        </SelectItem>
                        {availableBoards.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            <span className="flex items-center gap-2 truncate">
                              {b.title}
                              {b._count.elements > 0 && (
                                <span className="text-[11px] text-muted-foreground">({b._count.elements})</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button onClick={() => setBoardPickerOpen(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Отмена
                    </button>
                  </div>
                ) : currentBoard ? (
                  <div className="space-y-2">
                    <div className="w-full h-9 rounded-full border border-input px-3 flex items-center gap-2 text-sm">
                      <Icon icon={LayoutDashboard} size="xs" style={{ color: labelColor }} className="shrink-0" />
                      <span className="truncate flex-1">{currentBoard.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false)
                          router.push(`/board/${currentBoard.id}`)
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1"
                      >
                        <Icon icon={ExternalLink} size="xs" />
                        Открыть
                      </button>
                      {isTeacher && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <button
                            type="button"
                            onClick={() => setBoardPickerOpen(true)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Сменить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : isTeacher ? (
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      disabled={generatingBoard}
                      onClick={() => handleGenerateBoard(currentLesson.id)}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {generatingBoard ? (
                        <span className="flex items-center gap-1.5">
                          <Icon icon={Loader2} size="xs" className="animate-spin" />
                          Создание…
                        </span>
                      ) : (
                        'Создать доску'
                      )}
                    </button>
                    <span className="text-muted-foreground/30">·</span>
                    <button
                      type="button"
                      onClick={() => setBoardPickerOpen(true)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Выбрать
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Reschedule panel */}
              {rescheduleMode && isTeacher && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="text-sm font-semibold">Перенести занятие</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Начало</Label>
                      <input type="datetime-local" value={newStart} onChange={e=>setNewStart(e.target.value)} className="w-full rounded-full border px-3 py-1.5 text-sm bg-background h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Конец</Label>
                      <input type="datetime-local" value={newEnd} onChange={e=>setNewEnd(e.target.value)} className="w-full rounded-full border px-3 py-1.5 text-sm bg-background h-9" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={()=>setRescheduleMode(false)}>Отмена</Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
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
          )}
        </div>

        {/* Fixed bottom area — matches creation form */}
        <div className="p-4 sm:p-6 pt-4">
          {editMode && isTeacher ? (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setEditMode(false)}>Отмена</Button>
              <Button className="flex-1 rounded-xl" onClick={handleSaveEdit}>Сохранить</Button>
            </div>
          ) : isTeacher ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full rounded-xl">
                  <Icon icon={MoreHorizontal} size="sm" className="mr-2" />
                  Действия
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem onClick={() => setEditMode(true)} className="cursor-pointer">
                  <Icon icon={Pencil} size="xs" className="mr-2" />
                  Изменить
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRescheduleMode(true)} className="cursor-pointer">
                  <Icon icon={Calendar} size="xs" className="mr-2" />
                  Перенести
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {getStatusActions().map(action => (
                  <DropdownMenuItem
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                    className={`cursor-pointer ${action.color}`}
                  >
                    <Icon icon={action.icon} size="xs" className="mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Icon icon={Trash2} size="xs" className="mr-2" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
