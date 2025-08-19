// Типы для планера
// Убраны Supabase сгенерированные типы после миграции на Prisma

// Экспортируем упрощённый тип урока (соответствует модели Prisma Lesson)
export interface Lesson {
  id: string
  title: string
  description: string | null
  startTime: string // ISO
  endTime: string // ISO
  userId: string
  relationId?: string | null
  isRecurring: boolean
  recurrence: Record<string, unknown> | null
  labelColor: string | null
  createdAt: string
  updatedAt: string
  // Legacy planner fields kept for compatibility until fully refactored
  status?: string
  duration_minutes?: number
  student_id?: string | null
  price?: number | string | null
  recurrence_rule?: string | null
  is_series_master?: boolean
  parent_series_id?: string | null
  label_color?: string | null
}

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
