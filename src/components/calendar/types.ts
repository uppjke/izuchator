// Базовые типы для календаря
import type { Lesson as LessonFromDB } from '@/lib/types/database.generated'

// Экспортируем тип урока из БД
export type Lesson = LessonFromDB

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
