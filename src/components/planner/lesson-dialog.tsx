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
  student_id: z.string().uuid('Неверный формат ID ученика'),
  date: z.string(),
  time: z.string(),
  duration_minutes: z.coerce.number().int().positive('> 0').max(24 * 60, 'Слишком долго'),
  label_color: z.string().regex(COLOR_REGEX, 'Неверный цвет'),
  repeat_enabled: z.boolean().optional().default(false),
  repeat_pattern: z.enum(['daily','weekly','custom_weekly','monthly_date','monthly_weekday']).optional(),
  repeat_interval: z.coerce.number().int().positive().max(52).optional(),
  repeat_weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  repeat_end_type: z.enum(['never','until','count']).optional(),
  repeat_end_date: z.string().optional(),
  repeat_count: z.coerce.number().int().positive().max(100).optional()
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
  if (!values.repeat_enabled) return [base]
  const pattern = values.repeat_pattern || 'weekly'
  const interval = values.repeat_interval || 1
  const endType = values.repeat_end_type || 'never'
  const endDate = endType === 'until' && values.repeat_end_date ? new Date(values.repeat_end_date + 'T23:59:59') : null
  const targetCount = endType === 'count' ? (values.repeat_count || 1) : null
  const maxCap = 50
  const dates: Date[] = []
  const weekdays = (values.repeat_weekdays || []).sort()
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
    while (safety < 370 && shouldContinue(cursor)) {
      safety++
      cursor = addDays(cursor, 1)
      if (!shouldContinue(cursor)) break
      if (selected.size === 0) continue
      if (selected.has(cursor.getDay())) push(new Date(cursor))
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
      student_id: '',
      date: defaultDate,
      time: defaultTime,
      duration_minutes: 60,
      label_color: '#3b82f6',
      repeat_enabled: false,
      repeat_pattern: 'weekly',
      repeat_interval: 1,
      repeat_weekdays: [],
      repeat_end_type: 'never',
      repeat_end_date: undefined,
      repeat_count: 10
    } as FormValues
  })

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        student_id: '',
        date: defaultDate,
        time: defaultTime,
        duration_minutes: 60,
        label_color: '#3b82f6',
        repeat_enabled: false,
        repeat_pattern: 'weekly',
        repeat_interval: 1,
        repeat_weekdays: [],
        repeat_end_type: 'never',
        repeat_end_date: undefined,
        repeat_count: 10
      })
    }
  }, [open, defaultDate, defaultTime, reset])

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const iso = new Date(`${values.date}T${values.time}:00`)
      const dates = generateRecurrenceDates(iso, values)

      let successCount = 0
      for (const d of dates) {
        const result = await createLesson({
          title: values.title.trim(),
          description: values.description?.trim() || null,
          student_id: values.student_id,
          start_time: d,
          duration_minutes: values.duration_minutes,
          label_color: values.label_color,
          reminder_minutes: 30
        })
        if (result.success) successCount++
      }
      if (successCount === dates.length) {
        toast.success(`Создано занятий: ${successCount}`)
      } else if (successCount > 0) {
        toast.warning(`Создано ${successCount} из ${dates.length}`)
      } else {
        toast.error('Не удалось создать занятия')
        return
      }
      onOpenChange(false)
      onCreated?.()
    } catch (e) {
      console.error(e)
      toast.error('Ошибка создания занятия')
    }
  }

  type TeacherStudentRelation = Awaited<ReturnType<typeof getTeacherStudents>>[0]
  const students = (studentsData || []).map((rel: TeacherStudentRelation) => {
    const student = rel.student as TeacherStudentRelation['student'] | undefined
    if (!student?.id) return null
    const name = student.full_name || student.email || 'Без имени'
    return { id: student.id, name }
  }).filter((s): s is { id: string; name: string } => Boolean(s))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">Новый урок</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Заполните данные занятия
          </DialogDescription>
        </DialogHeader>
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              className="w-full min-h-[80px] text-sm rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              maxLength={300}
            />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Ученик *</Label>
            <Select onValueChange={(v) => setValue('student_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder={studentsLoading ? 'Загрузка...' : 'Выберите ученика'} />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.student_id && <p className="text-xs text-red-600">{errors.student_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дата *</Label>
              <Input type="date" {...register('date')} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Время *</Label>
              <Input type="time" {...register('time')} disabled={isSubmitting} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Длительность (мин)</Label>
              <Input type="number" {...register('duration_minutes', { valueAsNumber: true })} disabled={isSubmitting} />
              {errors.duration_minutes && <p className="text-xs text-red-600">{errors.duration_minutes.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">Цвет метки</Label>
              <ColorSwatchPicker
                value={watch('label_color')}
                disabled={isSubmitting}
                onChange={(c) => setValue('label_color', c, { shouldDirty: true })}
              />
              {errors.label_color && <p className="text-xs text-red-600">{errors.label_color.message}</p>}
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
  const enabled = watch('repeat_enabled')
  const pattern = watch('repeat_pattern')
  const interval = watch('repeat_interval') || 1
  const endType = watch('repeat_end_type')
  const weekdays = watch('repeat_weekdays') || []
  const count = watch('repeat_count') || 10
  const endDate = watch('repeat_end_date')

  const toggleWeekday = (d: number) => {
    const current = new Set(weekdays)
    if (current.has(d)) {
      current.delete(d)
    } else {
      current.add(d)
    }
    setValue('repeat_weekdays', Array.from(current).sort(), { shouldDirty: true })
  }

  const summary = () => {
    if (!enabled) return 'Однократно'
    let base = ''
    switch (pattern) {
      case 'daily': base = `Каждые ${interval === 1 ? '' : interval + ' '}дн`; break
      case 'weekly': base = `Каждую ${interval === 1 ? '' : interval + '-ю '}неделю`; break
      case 'custom_weekly': base = weekdays.length ? `Дни: ${weekdays.map(w => 'ВС ПН ВТ СР ЧТ ПТ СБ'.split(' ')[w]).join(',')}` : 'Выбрать дни'; break
      case 'monthly_date': base = `Ежемесячно ${interval>1? 'x'+interval:''}`; break
      case 'monthly_weekday': base = `Ежемесячно (день недели)`; break
      default: base = ''
    }
    let tail = ''
    if (endType === 'until' && endDate) tail = ` до ${endDate}`
    else if (endType === 'count') tail = ` (${count} раз)`
    return base + tail
  }

  return (
    <div className="space-y-2">
      <Popover onOpenChange={(o) => { if (o && !enabled) setValue('repeat_enabled', true, { shouldDirty: true }) }}>
        <PopoverTrigger asChild>
          <div
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-disabled={disabled || undefined}
            aria-haspopup="dialog"
            aria-expanded={enabled ? true : undefined}
            onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
            className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm select-none outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${enabled ? 'border-blue-500 bg-blue-50/60 text-blue-700' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'} `}
          >
            <span className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <span className="font-medium">Повторение</span>
            </span>
            <span className="truncate text-xs font-normal max-w-[55%]">{summary()}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 space-y-4" align="end">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">Повторение</p>
              <p className="text-[11px] text-muted-foreground">Настройте параметры</p>
            </div>
            {enabled && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setValue('repeat_enabled', false, { shouldDirty: true })}
              >Отключить</button>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Шаблон</Label>
                <select
                  value={pattern}
                  onChange={e => setValue('repeat_pattern', e.target.value as 'daily' | 'weekly' | 'custom_weekly' | 'monthly_date' | 'monthly_weekday', { shouldDirty: true })}
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="daily">Каждый день</option>
                  <option value="weekly">Каждую неделю</option>
                  <option value="custom_weekly">Выбранные дни</option>
                  <option value="monthly_date">Ежемесячно (дата)</option>
                  <option value="monthly_weekday">Ежемесячно (день недели)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Интервал</Label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={e => setValue('repeat_interval', Number(e.target.value || 1), { shouldDirty: true })}
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                />
              </div>
            </div>
            {pattern === 'custom_weekly' && (
              <div className="space-y-1">
                <Label className="text-xs">Дни</Label>
                <div className="grid grid-cols-7 gap-1">
                  {['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((l,idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className={`h-7 text-[11px] rounded-md border flex items-center justify-center ${weekdays.includes(idx) ? 'bg-blue-600 text-white border-blue-600' : 'bg-background hover:bg-muted'}`}
                    >{l}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Окончание</Label>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {['never','until','count'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setValue('repeat_end_type', opt as 'never' | 'until' | 'count', { shouldDirty: true })}
                    className={`px-2 py-1 rounded-md border ${endType===opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-background hover:bg-muted'}`}
                  >
                    {opt==='never'?'Бессрочно':opt==='until'?'До даты':'По количеству'}
                  </button>
                ))}
              </div>
              {endType === 'until' && (
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={e => setValue('repeat_end_date', e.target.value || undefined, { shouldDirty: true })}
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                />
              )}
              {endType === 'count' && (
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={e => setValue('repeat_count', Number(e.target.value || 1), { shouldDirty: true })}
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                />
              )}
            </div>
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
          className="w-9 h-9 rounded-full border border-gray-300 shadow-sm flex items-center justify-center relative focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition hover:scale-105"
          aria-label={`Выбрать цвет ${COLOR_LABEL[current] || current}`}
          style={{ backgroundColor: current }}
        >
          <span className="sr-only">Цвет {current}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end" sideOffset={6}>
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
