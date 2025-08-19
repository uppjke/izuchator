"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Lesson } from './types'
import { Icon } from '@/components/ui/icon'
import { Clock, Calendar, User, Repeat, X, Palette, Trash2, AlertTriangle, ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useTeacherStudents } from '@/hooks/use-relations'
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
  const { data: students = [] } = useTeacherStudents(user?.id)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Получаем актуальные данные занятия из БД
  const { data: lessonData, isLoading } = useQuery({
    queryKey: ['lesson', lesson?.id],
    queryFn: () => lesson ? getLessonById(lesson.id) : null,
    enabled: Boolean(lesson?.id && open),
  })

  const currentLesson = lessonData?.lesson || lesson
  if (!currentLesson) return null

  const studentRelation = students.find((r: any) => r.student?.id === (currentLesson as any).student_id)
  const studentName = studentRelation?.teacherName || studentRelation?.student?.name || studentRelation?.student?.email || 'Ученик'

  const start = new Date(currentLesson.startTime)
  const end = new Date(currentLesson.endTime)

  let recurrenceSummary: string | null = null
  if ((currentLesson as any).recurrence_rule) {
    try {
      const obj = JSON.parse((currentLesson as any).recurrence_rule)
      if (obj?.weekdays?.length) {
        const map: Record<number,string> = {0:'Вс',1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб'}
        const base = obj.weekdays.sort().map((d:number)=>map[d]).join(',')
        if (obj.end_type === 'until' && obj.end_date) recurrenceSummary = base + ' до ' + obj.end_date
        else if (obj.end_type === 'count' && obj.count) recurrenceSummary = base + ` (${obj.count} раз)`
        else recurrenceSummary = base
      }
    } catch {}
  }

  const isRecurring = !!((currentLesson as any).is_series_master || (currentLesson as any).parent_series_id)

  const handleDelete = async (deleteType: 'single' | 'series' | 'future' | 'weekday_future' | 'student_future_all') => {
    try {
      await deleteLesson(currentLesson.id)
      toast.success('Урок удален')
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
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
                  <Button variant="destructive" className="w-full sm:w-auto flex items-center gap-1">
                    Удалить
                    <Icon icon={ChevronDown} size="xs" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleDelete('single')} className="cursor-pointer">
                    Только это занятие
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete('weekday_future')} className="cursor-pointer">
                    Все по этому дню недели
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete('student_future_all')} className="cursor-pointer text-red-600 focus:text-red-600">
                    Это и все последующие занятия ученика
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="destructive" onClick={() => handleDelete('single')} className="w-full sm:w-auto">Удалить</Button>
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
          {infoRow(User, 'Ученик', studentName)}
          {infoRow(Calendar, 'Дата', format(start, 'd MMMM yyyy (EEEE)', { locale: ru }))}
          {infoRow(Clock, 'Время', `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`)}
      {infoRow(Palette, 'Цвет', (
            <div className="flex items-center gap-2">
        {(currentLesson as any).label_color && <span className="w-4 h-4 rounded-full border" style={{ background: (currentLesson as any).label_color }} />}
        <span>{(currentLesson as any).label_color || 'По умолчанию'}</span>
            </div>
          ))}
          {recurrenceSummary && infoRow(Repeat, 'Повтор', recurrenceSummary)}
          {infoRow(X, 'Статус', (currentLesson as any).status)}
          {infoRow(Repeat, 'Серия', (currentLesson as any).is_series_master ? 'Мастер занятие серии' : ((currentLesson as any).parent_series_id ? 'Часть серии' : '—'))}
          {infoRow(X, 'Описание', currentLesson.description || '—')}
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2"
          >
            <Icon icon={Trash2} size="xs" />
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
