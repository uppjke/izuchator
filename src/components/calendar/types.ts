// Базовые типы для календаря
import type { Database } from '@/lib/types/database.generated'

// Экспортируем тип урока из БД
export type Lesson = Database['public']['Tables']['lessons']['Row']

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
