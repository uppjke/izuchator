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
import { format } from 'date-fns'

// Новая схема: без статуса/цены/напоминания, добавлены краткое описание и цвет
const COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/
const schema = z.object({
  title: z.string().min(2, 'Минимум 2 символа'),
  description: z.string().max(300, 'Макс 300 символов').optional().or(z.literal('')),
  student_id: z.string().uuid('Неверный формат ID ученика'),
  date: z.string(),
  time: z.string(),
  duration_minutes: z.coerce.number().int().positive('> 0').max(24 * 60, 'Слишком долго'),
  label_color: z.string().regex(COLOR_REGEX, 'Неверный цвет')
})

type FormValues = z.infer<typeof schema>

interface LessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date?: Date | null
  onCreated?: () => void
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
      label_color: '#3b82f6'
    } as FormValues
  })

  // Сбрасываем значения при открытии с новой датой
  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        student_id: '',
        date: defaultDate,
        time: defaultTime,
        duration_minutes: 60,
        label_color: '#3b82f6'
      })
    }
  }, [open, defaultDate, defaultTime, reset])

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const iso = new Date(`${values.date}T${values.time}:00`)
      const result = await createLesson({
        title: values.title.trim(),
        description: values.description?.trim() || null,
        student_id: values.student_id,
        start_time: iso,
        duration_minutes: values.duration_minutes,
        label_color: values.label_color,
        reminder_minutes: 30
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success('Занятие создано')
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
