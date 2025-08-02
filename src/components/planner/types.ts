// Типы для планера
import type { Database } from '@/lib/types/database.generated'

// Экспортируем тип урока из БД
export type Lesson = Database['public']['Tables']['lessons']['Row']

// Режимы отображения планера
export type PlannerView = 'week' | 'agenda'

// День в планере
export interface PlannerDay {
  date: Date
  isToday: boolean
  lessons: Lesson[]
}

// Неделя в планере
export interface PlannerWeek {
  days: PlannerDay[]
  weekStart: Date
  weekEnd: Date
}

// Пропсы для компонентов планера
export interface PlannerProps {
  lessons?: Lesson[]
  onCreateLesson?: (date: Date) => void
  onEditLesson?: (lesson: Lesson) => void
}
