// Типы для планера

// Статусы уроков
export type LessonStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled'

// Экспортируем тип урока (соответствует модели Prisma Lesson)
export interface Lesson {
  id: string
  title: string
  description: string | null
  startTime: string // ISO
  endTime: string // ISO
  userId: string
  relationId?: string | null
  boardId?: string | null
  isRecurring: boolean
  recurrence: Record<string, unknown> | null
  labelColor: string | null
  status: LessonStatus
  previousStartTime?: string | null
  previousEndTime?: string | null
  createdAt: string
  updatedAt: string
  // Связь с отношением teacher-student (опционально загружается)
  relation?: {
    id: string
    teacherId: string
    studentId: string
    teacherName?: string | null
    studentName?: string | null
    teacher?: { id: string; name?: string | null; email?: string | null }
    student?: { id: string; name?: string | null; email?: string | null }
  } | null
  // Привязанная доска
  board?: {
    id: string
    title: string
    thumbnail?: string | null
  } | null
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
