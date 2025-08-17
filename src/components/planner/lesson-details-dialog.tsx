"use client"
import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { Lesson } from './types'
import { Icon } from '@/components/ui/icon'
import { Clock, Calendar, User, Repeat, X, Palette } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useTeacherStudents } from '@/hooks/use-relations'
import { useAuth } from '@/lib/auth-context'

interface LessonDetailsDialogProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LessonDetailsDialog({ lesson, open, onOpenChange }: LessonDetailsDialogProps) {
  const { user } = useAuth()
  const { data: students = [] } = useTeacherStudents(user?.id)

  if (!lesson) return null

  const studentRelation = students.find(r => r.student?.id === lesson.student_id)
  const studentName = studentRelation?.teacher_custom_name_for_student || studentRelation?.student?.full_name || studentRelation?.student?.email || 'Ученик'

  const start = new Date(lesson.start_time)
  const end = new Date(start.getTime() + lesson.duration_minutes * 60000)

  let recurrenceSummary: string | null = null
  if (lesson.recurrence_rule) {
    try {
      const obj = JSON.parse(lesson.recurrence_rule)
      if (obj?.weekdays?.length) {
        const map: Record<number,string> = {0:'Вс',1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб'}
        const base = obj.weekdays.sort().map((d:number)=>map[d]).join(',')
        if (obj.end_type === 'until' && obj.end_date) recurrenceSummary = base + ' до ' + obj.end_date
        else if (obj.end_type === 'count' && obj.count) recurrenceSummary = base + ` (${obj.count} раз)`
        else recurrenceSummary = base
      }
    } catch {}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between gap-4">
            <span className="truncate">{lesson.title}</span>
          </DialogTitle>
          <DialogDescription>
            Полная информация о занятии
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {infoRow(User, 'Ученик', studentName)}
          {infoRow(Calendar, 'Дата', format(start, 'd MMMM yyyy (EEEE)', { locale: ru }))}
          {infoRow(Clock, 'Время', `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}  · ${lesson.duration_minutes} мин`)}
          {infoRow(Palette, 'Цвет', (
            <div className="flex items-center gap-2">
              {lesson.label_color && <span className="w-4 h-4 rounded-full border" style={{ background: lesson.label_color }} />}
              <span>{lesson.label_color || 'По умолчанию'}</span>
            </div>
          ))}
          {recurrenceSummary && infoRow(Repeat, 'Повтор', recurrenceSummary)}
          {infoRow(X, 'Статус', lesson.status)}
          {infoRow(Repeat, 'Серия', lesson.is_series_master ? 'Мастер занятие серии' : (lesson.parent_series_id ? 'Часть серии' : '—'))}
          {infoRow(X, 'Описание', lesson.description || '—')}
        </div>
      </DialogContent>
    </Dialog>
  )
}
