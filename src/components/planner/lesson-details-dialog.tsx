"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Lesson } from './types'
import { Icon } from '@/components/ui/icon'
import { Clock, Calendar, User, Repeat, X, Trash2, AlertTriangle, ChevronDown, CheckCircle, XCircle, BadgeInfo } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'
import { useQuery } from '@tanstack/react-query'
import { getLessonById, deleteLesson } from '@/lib/api'
import { toast } from 'sonner'

interface LessonDetailsDialogProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function LessonDetailsDialog({ lesson, open, onOpenChange, onDeleted }: LessonDetailsDialogProps) {
  const { user } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Проверяем, является ли пользователь преподавателем
  const isTeacher = user?.role === 'teacher'

  // Получаем актуальные данные занятия из БД
  const { data: lessonData, isLoading } = useQuery({
    queryKey: ['lesson', lesson?.id],
    queryFn: () => lesson ? getLessonById(lesson.id) : null,
    enabled: Boolean(lesson?.id && open),
  })

  const currentLesson = lessonData?.lesson || lesson
  if (!currentLesson) return null

  // Получаем информацию об ученике из связи
  const relation = (currentLesson as { relation?: { teacherId?: string; studentId?: string; teacherName?: string; studentName?: string; teacher?: { name?: string; email?: string }; student?: { name?: string; email?: string } } }).relation
  let studentName = 'Ученик'
  
  if (relation) {
    // Определяем, кто текущий пользователь - преподаватель или ученик
    const isTeacher = relation.teacherId === user?.id
    
    if (isTeacher) {
      // Если текущий пользователь - преподаватель, показываем ученика
      studentName = relation.studentName || relation.student?.name || relation.student?.email || 'Ученик'
    } else {
      // Если текущий пользователь - ученик, показываем преподавателя
      studentName = relation.teacherName || relation.teacher?.name || relation.teacher?.email || 'Преподаватель'
    }
  }

  const start = new Date(currentLesson.startTime)
  const end = new Date(currentLesson.endTime)

  let recurrenceSummary: string | null = null
  if ((currentLesson as { recurrence_rule?: string }).recurrence_rule) {
    try {
      const obj = JSON.parse((currentLesson as { recurrence_rule?: string }).recurrence_rule!)
      if (obj?.weekdays?.length) {
        const map: Record<number,string> = {0:'Вс',1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб'}
        const base = obj.weekdays.sort().map((d:number)=>map[d]).join(',')
        if (obj.end_type === 'until' && obj.end_date) recurrenceSummary = base + ' до ' + obj.end_date
        else if (obj.end_type === 'count' && obj.count) recurrenceSummary = base + ` (${obj.count} раз)`
        else recurrenceSummary = base
      }
    } catch {}
  }

  const isRecurring = !!((currentLesson as { is_series_master?: boolean; parent_series_id?: string }).is_series_master || (currentLesson as { is_series_master?: boolean; parent_series_id?: string }).parent_series_id)

  // Маппинг статусов на человеко-понятные метки
  const statusMap: Record<string, string> = {
    scheduled: 'Запланировано',
    completed: 'Проведено', // изменено с "Завершено" по требованию
    cancelled: 'Отменено',
    confirmed: 'Подтверждено',
    in_progress: 'В процессе'
  }
  const rawStatus = (currentLesson as { status?: string }).status || 'scheduled'
  const statusLabel = statusMap[rawStatus] || rawStatus

  // Статус оплаты (по аналогии с agenda-view)
  const isPaid = Boolean((currentLesson as { price?: number | string | null }).price)

  // Ограниченное описание
  const limitedDescription = currentLesson.description
    ? (currentLesson.description.length > 250
        ? currentLesson.description.slice(0, 247).trimEnd() + '…'
        : currentLesson.description)
    : null

  const handleDelete = async () => {
    try {
      await deleteLesson(currentLesson.id)
      toast.success('Урок удален')
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
                  <DropdownMenuItem onClick={() => handleDelete()} className="cursor-pointer">
                    Только это занятие
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete()} className="cursor-pointer">
                    Все по этому дню недели
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete()} className="cursor-pointer text-red-600 focus:text-red-600">
                    Это и все последующие занятия ученика
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="destructive" onClick={() => handleDelete()} className="w-full sm:w-auto text-white flex items-center gap-1">
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
      <DialogContent className="sm:max-w-lg max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between gap-4">
            <span className="truncate">{currentLesson.title}</span>
            {isLoading && <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </DialogTitle>
          <DialogDescription>
            Полная информация о занятии
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {infoRow(User, 'Участник', studentName)}
          {infoRow(Calendar, 'Дата', format(start, 'd MMMM yyyy (EEEE)', { locale: ru }))}
          {infoRow(Clock, 'Время', `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`)}
          {recurrenceSummary && infoRow(Repeat, 'Повтор', recurrenceSummary)}
          {infoRow(BadgeInfo, 'Статус', statusLabel)}
          {infoRow(isPaid ? CheckCircle : XCircle, 'Оплата', (
            <span className={isPaid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {isPaid ? 'Оплачено' : 'Не оплачено'}
            </span>
          ))}
          {infoRow(X, 'Описание', limitedDescription || '—')}
        </div>
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
      </DialogContent>
    </Dialog>
  )
}
