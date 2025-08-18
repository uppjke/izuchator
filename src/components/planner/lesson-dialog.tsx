'use client'

import React, { useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm, SubmitHandler, Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Icon } from '@/components/ui/icon'
import { Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTeacherStudents } from '@/hooks/use-relations'
import type { getTeacherStudents } from '@/lib/api'
import { createLesson } from '@/lib/api'
import { toast } from 'sonner'
import { format, addDays, addWeeks, addMonths } from 'date-fns'

// Новая схема: без статуса/цены/напоминания, добавлены краткое описание, цвет и повторение
const COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/
const schema = z.object({
  title: z.string().min(2, 'Минимум 2 символа'),
  description: z.string().max(300, 'Макс 300 символов').optional().or(z.literal('')),
  relationId: z.string().uuid('Неверный формат ID связи'),
  date: z.string(),
  time: z.string(),
  durationMinutes: z.coerce.number().int().positive('> 0').max(24 * 60, 'Слишком долго'),
  labelColor: z.string().regex(COLOR_REGEX, 'Неверный цвет'),
  repeatEnabled: z.boolean().optional().default(false),
  repeatPattern: z.enum(['daily','weekly','custom_weekly','monthly_date','monthly_weekday']).optional(),
  repeatInterval: z.coerce.number().int().positive().max(52).optional(),
  repeatWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  repeatEndType: z.enum(['never','until','count']).optional(),
  repeatEndDate: z.string().optional(),
  repeatCount: z.coerce.number().int().positive().max(100).optional()
}).superRefine((val, ctx) => {
  if (val.repeatEnabled && val.repeatEndType === 'until') {
    if (!val.repeatEndDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Укажите дату окончания', path: ['repeatEndDate'] })
    } else if (val.repeatEndDate < val.date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Дата окончания раньше даты первого занятия', path: ['repeatEndDate'] })
    }
  }
})

type FormValues = z.infer<typeof schema>

interface LessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date?: Date | null
  onCreated?: () => void
}

// Вынесенная функция генерации дат повторения
function generateRecurrenceDates(base: Date, values: FormValues): Date[] {
  if (!values.repeatEnabled) return [base]
  const pattern = values.repeatPattern || 'weekly'
  const interval = values.repeatInterval || 1
  const endType = values.repeatEndType || 'never'
  const endDate = endType === 'until' && values.repeatEndDate ? new Date(values.repeatEndDate + 'T23:59:59') : null
  const targetCount = endType === 'count' ? (values.repeatCount || 1) : null
  const maxCap = 50
  const dates: Date[] = []
  const weekdays = (values.repeatWeekdays || []).sort()
  const push = (d: Date) => {
    if (dates.length === 0 || d.getTime() !== dates[dates.length - 1].getTime()) {
      dates.push(d)
    }
  }
  push(base)
  if (targetCount && targetCount <= 1) return dates
  const shouldContinue = (next: Date) => {
    if (endDate && next > endDate) return false
    if (targetCount && dates.length >= targetCount) return false
    if (!endDate && !targetCount && dates.length >= maxCap) return false
    return true
  }
  if (pattern === 'daily') {
    let cursor = new Date(base)
    while (true) {
      cursor = addDays(cursor, interval)
      if (!shouldContinue(cursor)) break
      push(new Date(cursor))
    }
  } else if (pattern === 'weekly') {
    let cursor = new Date(base)
    while (true) {
      cursor = addWeeks(cursor, interval)
      if (!shouldContinue(cursor)) break
      push(new Date(cursor))
    }
  } else if (pattern === 'custom_weekly') {
    const selected = new Set(weekdays)
    let cursor = new Date(base)
    let safety = 0
    // Определяем начало базовой недели (понедельник)
    const baseWeekStart = new Date(base)
    baseWeekStart.setHours(0,0,0,0)
    while (baseWeekStart.getDay() !== 1) {
      baseWeekStart.setDate(baseWeekStart.getDate() - 1)
    }
    while (safety < 370 && shouldContinue(cursor)) {
      safety++
      cursor = addDays(cursor, 1)
      if (!shouldContinue(cursor)) break
      if (selected.size === 0) continue
      if (selected.has(cursor.getDay())) {
        if (interval <= 1) {
          push(new Date(cursor))
        } else {
          // Считаем смещение недель от базовой недели
            const candidateWeekStart = new Date(cursor)
            candidateWeekStart.setHours(0,0,0,0)
            while (candidateWeekStart.getDay() !== 1) {
              candidateWeekStart.setDate(candidateWeekStart.getDate() - 1)
            }
            const weeksDiff = Math.floor((candidateWeekStart.getTime() - baseWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
            if (weeksDiff % interval === 0) {
              push(new Date(cursor))
            }
        }
      }
    }
  } else if (pattern === 'monthly_date') {
    let cursor = new Date(base)
    while (true) {
      cursor = addMonths(cursor, interval)
      if (!shouldContinue(cursor)) break
      push(new Date(cursor))
    }
  } else if (pattern === 'monthly_weekday') {
    const baseWeekday = base.getDay()
    const baseMonth = base.getMonth()
    const baseYear = base.getFullYear()
    const weekdayOrdinal = Math.floor((base.getDate() - 1) / 7)
    let cursorMonth = baseMonth
    let cursorYear = baseYear
    while (true) {
      cursorMonth += interval
      while (cursorMonth > 11) { cursorMonth -= 12; cursorYear += 1 }
      const firstOfMonth = new Date(cursorYear, cursorMonth, 1, base.getHours(), base.getMinutes())
      const dayOffset = (baseWeekday - firstOfMonth.getDay() + 7) % 7
      const day = 1 + dayOffset + weekdayOrdinal * 7
      const candidate = new Date(cursorYear, cursorMonth, day, base.getHours(), base.getMinutes())
      if (candidate.getMonth() !== cursorMonth) continue
      if (!shouldContinue(candidate)) break
      push(candidate)
    }
  }
  return dates
}

export function LessonDialog({ open, onOpenChange, date, onCreated }: LessonDialogProps) {
  const { user } = useAuth()
  const { data: studentsData, isLoading: studentsLoading } = useTeacherStudents(user?.id)
  const defaultDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const defaultTime = date ? format(date, 'HH:mm') : '09:00'
  const resolver = zodResolver(schema) as unknown as Resolver<FormValues>
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver,
    defaultValues: {
      title: '',
      description: '',
      relationId: '',
      date: defaultDate,
      time: defaultTime,
      durationMinutes: 60,
      labelColor: '#3b82f6',
      repeatEnabled: false,
      repeatPattern: 'custom_weekly',
      repeatInterval: 1,
      repeatWeekdays: [],
      repeatEndType: 'never',
      repeatEndDate: undefined,
      repeatCount: 10
    } as FormValues
  })

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
  relationId: '',
        date: defaultDate,
        time: defaultTime,
  durationMinutes: 60,
  labelColor: '#3b82f6',
  repeatEnabled: false,
  repeatPattern: 'custom_weekly',
  repeatInterval: 1,
  repeatWeekdays: [],
  repeatEndType: 'never',
  repeatEndDate: undefined,
  repeatCount: 10
      })
    }
  }, [open, defaultDate, defaultTime, reset])

  // Функция для генерации recurrence_rule из данных формы
  const generateRecurrenceRule = (values: FormValues): string | null => {
    if (!values.repeatEnabled || !values.repeatWeekdays || values.repeatWeekdays.length === 0) {
      return null
    }
    
    const rule = {
      pattern: 'custom_weekly',
  weekdays: values.repeatWeekdays,
  interval: values.repeatInterval || 1,
  end_type: values.repeatEndType || 'never',
  end_date: values.repeatEndDate,
  count: values.repeatCount
    }
    
    return JSON.stringify(rule)
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
  const iso = new Date(`${values.date}T${values.time}:00`)
      const dates = generateRecurrenceDates(iso, values)
      const recurrenceRule = generateRecurrenceRule(values)

      let successCount = 0
      let firstLessonId: string | null = null
      
      // Подготовим карту studentId -> relationId (используем поле student_id как relationId для совместимости формы)
  const relationId = values.relationId || undefined

      for (const d of dates) {
        const startTime = d
        const endTime = new Date(d.getTime() + values.durationMinutes * 60 * 1000)
        await createLesson({
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          startTime,
          endTime,
          relationId,
          labelColor: values.labelColor,
          isRecurring: values.repeatEnabled && dates.length > 1,
          recurrence: recurrenceRule ? JSON.parse(recurrenceRule) : undefined,
        })
        successCount++
      }

      toast.success(`Создано занятий: ${successCount}`)
      onOpenChange(false)
      onCreated?.()
    } catch (e) {
      console.error(e)
      toast.error('Ошибка создания занятия')
    }
  }

  type TeacherStudentRelation = Awaited<ReturnType<typeof getTeacherStudents>>[0]
  const students: { id: string; name: string }[] = (studentsData || []).map((rel: TeacherStudentRelation) => {
    const student = rel.student as TeacherStudentRelation['student'] | undefined
    if (!student?.id) return null
    const name = student.full_name || student.email || 'Без имени'
    // используем relation.id как value селекта (чтобы передать relationId в создание урока)
    return { id: rel.id, name }
  }).filter((s: { id: string; name: string } | null): s is { id: string; name: string } => Boolean(s))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">Новый урок</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Заполните данные занятия
          </DialogDescription>
        </DialogHeader>
        {/* Скроллируемая область формы для маленьких экранов */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input placeholder="Напр. Математика" {...register('title')} disabled={isSubmitting} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Краткое описание</Label>
            <textarea
              placeholder="Краткое примечание к занятию"
              {...register('description')}
              disabled={isSubmitting}
              className="w-full min-h-[96px] text-sm rounded-2xl border border-input bg-transparent px-4 py-3 focus-visible:outline-none focus-visible:border-blue-500 transition"
              maxLength={300}
            />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Ученик *</Label>
            <Select onValueChange={(v) => setValue('relationId', v)}>
              <SelectTrigger className="h-9 rounded-full">
                <SelectValue placeholder={studentsLoading ? 'Загрузка...' : 'Выберите ученика'} />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.relationId && <p className="text-xs text-red-600">{errors.relationId.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 grid-cols-1">
            <div className="space-y-2">
              <Label>Дата *</Label>
              <Input
                type="date"
                className="h-9 rounded-full px-3 [appearance:textfield] [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-datetime-edit]:text-sm [&::-webkit-calendar-picker-indicator]:opacity-60"
                {...register('date')}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Время *</Label>
              <Input
                type="time"
                className="h-9 rounded-full px-3 [appearance:textfield] [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-datetime-edit]:text-sm [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-time-picker-indicator]:opacity-60"
                {...register('time')}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 grid-cols-1">
            <div className="space-y-2">
              <Label>Длительность (мин)</Label>
              <Input type="number" {...register('durationMinutes', { valueAsNumber: true })} disabled={isSubmitting} />
              {errors.durationMinutes && <p className="text-xs text-red-600">{(errors as any).durationMinutes?.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">Цвет метки</Label>
              <ColorSwatchPicker
                value={watch('labelColor')}
                disabled={isSubmitting}
                onChange={(c) => setValue('labelColor', c, { shouldDirty: true })}
              />
              {errors.labelColor && <p className="text-xs text-red-600">{(errors as any).labelColor?.message}</p>}
            </div>
          </div>
          <RecurrenceControl
            watch={watch}
            setValue={setValue}
            disabled={isSubmitting}
          />
          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isSubmitting || studentsLoading}>
              {isSubmitting ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Улучшенный компонент выбора цвета с поповером, пресетами, недавними и hex вводом
const PRESET_COLORS = ['#3b82f6','#6366f1','#10b981','#f59e0b','#ef4444','#ec4899','#0ea5e9','#84cc16','#9333ea','#64748b']
const COLOR_LABEL: Record<string,string> = {
  '#3b82f6':'Синий','#6366f1':'Индиго','#10b981':'Зелёный','#f59e0b':'Янтарный',
  '#ef4444':'Красный','#ec4899':'Розовый','#0ea5e9':'Голубой','#84cc16':'Лайм',
  '#9333ea':'Фиолетовый','#64748b':'Серый'
}

// Popover recurrence control
interface RecurrenceControlProps {
  watch: ReturnType<typeof useForm<FormValues>>['watch']
  setValue: ReturnType<typeof useForm<FormValues>>['setValue']
  disabled?: boolean
}

function RecurrenceControl({ watch, setValue, disabled }: RecurrenceControlProps) {
  const enabled = watch('repeatEnabled')
  // pattern & interval не используются в упрощённой версии UI
  const endType = watch('repeatEndType')
  const weekdays = watch('repeatWeekdays') || []
  const count = watch('repeatCount') || 10
  const endDate = watch('repeatEndDate')
  const interval = watch('repeatInterval') || 1
  const baseDateStr = watch('date')
  // baseTimeStr не нужен для текущего резюме
  const [open, setOpen] = React.useState(false)
  const [endPopoverOpen, setEndPopoverOpen] = React.useState<null | 'until' | 'count'>(null)

  // Close popover automatically if recurrence becomes disabled (e.g., after reset)
  React.useEffect(() => {
    if (open && !enabled) setOpen(false)
  }, [open, enabled])

  const toggleWeekday = (d: number) => {
    const current = new Set(weekdays)
    if (current.has(d)) {
      current.delete(d)
    } else {
      current.add(d)
    }
    const next = Array.from(current).sort()
  setValue('repeatWeekdays', next, { shouldDirty: true })
    if (next.length === 0) {
      // Автоматически отключаем повторение, если дней нет
  setValue('repeatEnabled', false, { shouldDirty: true })
    } else if (!enabled) {
      // Если пользователь начал выбирать дни при отключённом состоянии (например после выключения) — включим
  setValue('repeatEnabled', true, { shouldDirty: true })
    }
  }

  const summary = () => {
  if (!enabled || weekdays.length === 0) return 'Однократно'
  const order = [1,2,3,4,5,6,0]
  const labels: Record<number,string> = {0:'Вс',1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб'}
  let base = ''
  if (weekdays.length === 0) base = 'Выберите дни'
  else if (weekdays.length === 7) base = 'Каждый день'
  else if (weekdays.length === 5 && weekdays.every((d,i)=>[1,2,3,4,5][i]===d)) base = 'Будни'
  else if (weekdays.length === 1) base = `Каждую неделю (${labels[weekdays[0]]})`
  else base = order.filter(d => weekdays.includes(d)).map(d => labels[d]).join(',')
  if (interval > 1) base = `Каждые ${interval} нед.: ` + base
    let tail = ''
    if (endType === 'until' && endDate) tail = ` до ${endDate}`
    else if (endType === 'count') tail = ` (${count} раз)`
    return base + tail
  }

  // Preview intentionally removed per UX simplification

  return (
    <div className="space-y-2">
  <Popover onOpenChange={(o)=>{ setOpen(o) }}>
        <PopoverTrigger asChild>
          <div
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-disabled={disabled || undefined}
            aria-haspopup="dialog"
            aria-expanded={open || undefined}
            onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
            className={`w-full h-9 flex items-center justify-between rounded-full border border-input bg-transparent px-3 py-2 text-left text-sm select-none focus-visible:outline-none focus-visible:border-blue-500 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${(!enabled || weekdays.length === 0) ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            <span className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${(enabled && weekdays.length>0) ? 'bg-zinc-600' : 'bg-gray-300'}`} />
              <span className="font-medium">Повторение</span>
            </span>
            <span className={`truncate text-xs font-normal max-w-[55%] ${(!enabled || weekdays.length===0) ? 'text-muted-foreground' : 'text-foreground/70'}`}>{summary()}</span>
          </div>
    </PopoverTrigger>
          {/* Ограничиваем ширину для мобильных устройств */}
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-md sm:w-96 p-4 space-y-4" align="start" side="top" sameWidth={false}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Повторение</p>
            {enabled && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setValue('repeatWeekdays', [], { shouldDirty: true })
                    setValue('repeatEndType', 'never', { shouldDirty: true })
                    setValue('repeatEndDate', undefined, { shouldDirty: true })
                    setValue('repeatCount', 10, { shouldDirty: true })
                    setValue('repeatEnabled', false, { shouldDirty: true })
                    setOpen(false)
                    setEndPopoverOpen(null)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >Сброс</button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Дни недели</span>
                {enabled && weekdays.length === 0 && <span className="text-[10px] text-red-500">Выберите дни</span>}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[1,2,3,4,5,6,0].map(day => {
                  const label: Record<number,string> = {0:'Вс',1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб'}
                  const activeDay = weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      className={`h-7 text-[11px] rounded-md border flex items-center justify-center ${activeDay ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-background hover:bg-muted'} ${!enabled && !activeDay ? 'opacity-70' : ''}`}
                    >{label[day]}</button>
                  )
                })}
              </div>
            </div>
            {enabled && weekdays.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 text-[11px]">
                  {['never','until','count'].map(opt => {
                    const active = endType === opt
                    const commonBtn = (content: React.ReactNode) => (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (opt === 'never') {
                            setValue('repeatEndType', 'never', { shouldDirty: true });
                            setEndPopoverOpen(null)
                          } else if (opt === 'until') {
                            setValue('repeatEndType', 'until', { shouldDirty: true });
                            setEndPopoverOpen('until')
                          } else {
                            setValue('repeatEndType', 'count', { shouldDirty: true });
                            setEndPopoverOpen('count')
                          }
                        }}
                        className={`flex-1 px-2 py-1 rounded-md border transition ${active ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-background hover:bg-muted'}`}
                      >{content}</button>
                    )
                    if (opt === 'until') {
                      return (
                        <Popover key={opt} open={endPopoverOpen==='until'} onOpenChange={(o)=> setEndPopoverOpen(o? 'until': null)}>
                          <PopoverTrigger asChild>
                            {commonBtn('До')}
                          </PopoverTrigger>
                          <PopoverContent className="p-3 w-auto" align="start" side="top">
                            <input
                              type="date"
                              autoFocus
                              min={baseDateStr}
                              value={endDate || ''}
                              onChange={e => {
                                const v = e.currentTarget.value
                                if (!v) { setValue('repeatEndDate', undefined, { shouldDirty: true }); return }
                                setValue('repeatEndDate', v, { shouldDirty: true })
                              }}
                              className="h-8 rounded-md border bg-background px-2 text-xs"
                            />
                          </PopoverContent>
                        </Popover>
                      )
                    }
                    if (opt === 'count') {
                      return (
                        <Popover key={opt} open={endPopoverOpen==='count'} onOpenChange={(o)=> setEndPopoverOpen(o? 'count': null)}>
                          <PopoverTrigger asChild>
                            {commonBtn('Кол-во')}
                          </PopoverTrigger>
                          <PopoverContent className="p-3 w-auto" align="start" side="top">
                            <input
                              type="number"
                              autoFocus
                              min={1}
                              max={100}
                              value={count}
                              onChange={e => setValue('repeatCount', Number(e.target.value || 1), { shouldDirty: true })}
                              className="h-8 w-20 rounded-md border bg-background px-2 text-xs text-center"
                            />
                          </PopoverContent>
                        </Popover>
                      )
                    }
                    return (
                      <React.Fragment key={opt}>
                        {commonBtn('Бессрочно')}
                      </React.Fragment>
                    )
                  })}
                </div>
                {/* Inputs now integrated into popovers on the buttons above */}
              </div>
            )}
            {enabled && weekdays.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Интервал (недели)</div>
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setValue('repeatInterval', i, { shouldDirty: true })}
                      className={`flex-1 h-8 rounded-full text-xs font-medium border transition ${interval === i ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-background hover:bg-muted'}`}
                    >{i}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface ColorSwatchPickerProps { value: string; onChange:(color:string)=>void; disabled?: boolean }

function ColorSwatchPicker({ value, onChange, disabled }: ColorSwatchPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hexInput, setHexInput] = React.useState(value)
  const [recent, setRecent] = React.useState<string[]>([])
  const current = value || '#3b82f6'

  // Load recent from localStorage
  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lesson_color_recent') || '[]') as string[]
      if (Array.isArray(stored)) setRecent(stored.slice(0,6))
    } catch {}
  }, [])

  // Update hex input when external value changes
  React.useEffect(() => { setHexInput(current) }, [current])

  const applyColor = (c: string) => {
    onChange(c)
    setOpen(false)
    setHexInput(c)
    setRecent(prev => {
      const next = [c, ...prev.filter(p => p !== c)].slice(0,6)
      try { localStorage.setItem('lesson_color_recent', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const onHexBlur = () => {
    const v = hexInput.trim()
    if (/^#([0-9a-fA-F]{6})$/.test(v)) applyColor(v)
  }

  // Keyboard navigation in grid
  const swatchRefs = React.useRef<HTMLButtonElement[]>([])
  const handleKey = (e: React.KeyboardEvent) => {
    const flat = PRESET_COLORS
    const idx = flat.findIndex(c => c === current)
    if (idx === -1) return
    let next = idx
    const cols = 5
    switch (e.key) {
      case 'ArrowRight': next = (idx + 1) % flat.length; break
      case 'ArrowLeft': next = (idx - 1 + flat.length) % flat.length; break
      case 'ArrowDown': next = (idx + cols) % flat.length; break
      case 'ArrowUp': next = (idx - cols + flat.length) % flat.length; break
      case 'Enter': case ' ': applyColor(current); return
      default: return
    }
    e.preventDefault()
    const nextColor = flat[next]
    onChange(nextColor)
    swatchRefs.current[next]?.focus()
  }

  return (
  <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
            disabled={disabled}
          className="w-8 h-8 rounded-full border border-gray-300 shadow-sm flex items-center justify-center relative focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition hover:scale-105"
          aria-label={`Выбрать цвет ${COLOR_LABEL[current] || current}`}
          style={{ backgroundColor: current }}
        >
          <span className="sr-only">Цвет {current}</span>
        </button>
      </PopoverTrigger>
  <PopoverContent className="w-[calc(100vw-2rem)] max-w-xs sm:w-64 p-4" align="start" side="bottom" sameWidth={false}>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Предустановленные</div>
        <div className="grid grid-cols-5 gap-2 mb-3" onKeyDown={handleKey}>
          {PRESET_COLORS.map((c,i) => {
            const active = c === current
            return (
              <button
                key={c}
                ref={el => { if (el) swatchRefs.current[i] = el }}
                type="button"
                onClick={() => applyColor(c)}
                className={`relative w-8 h-8 rounded-full border flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition ${active ? 'ring-2 ring-offset-2 border-black/50' : 'border-gray-300 hover:scale-110'}`}
                style={{ backgroundColor: c }}
                aria-label={COLOR_LABEL[c] || c}
              >
                {active && <Icon icon={Check} size="xs" className="text-white drop-shadow" />}
              </button>
            )
          })}
        </div>
        {recent.length > 0 && (
          <>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Недавние</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {recent.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyColor(c)}
                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{ backgroundColor: c }}
                  aria-label={`Недавний ${c}`}
                />
              ))}
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={hexInput}
            onChange={e => setHexInput(e.target.value)}
            onBlur={onHexBlur}
            maxLength={7}
            className="w-24 h-8 text-xs rounded-md border border-input bg-background px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="HEX значение"
          />
          <input
            type="color"
            value={current}
            onChange={(e) => applyColor(e.target.value)}
            className="w-8 h-8 p-0 border rounded cursor-pointer"
            aria-label="Палитра браузера"
          />
          <button
            type="button"
            onClick={() => applyColor('#3b82f6')}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >Сброс</button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
