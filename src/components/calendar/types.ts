// Базовые типы для календаря
export interface Lesson {
  id: string
  title: string
  description?: string
  start_time: string // ISO string
  duration_minutes: number
  owner_id: string
  student_id: string
  room_id?: string
  reminder_minutes: number
  price?: number
  status: 'scheduled' | 'completed' | 'cancelled'
  // Повторы
  recurrence_rule?: string
  parent_series_id?: string
  is_series_master: boolean
}

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  lessons: Lesson[]
}

export interface CalendarWeek {
  days: CalendarDay[]
}

export type CalendarView = 'week' | 'day' | 'agenda'
