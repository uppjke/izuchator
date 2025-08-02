// Утилиты для планера
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
  addWeeks,
  subWeeks
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { PlannerDay, PlannerWeek, Lesson } from './types'

// Получить дни недели для планера (понедельник - воскресенье)
export function getWeekDays(date: Date): PlannerDay[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Неделя начинается с понедельника
  const end = endOfWeek(date, { weekStartsOn: 1 })
  
  const days = eachDayOfInterval({ start, end })
  
  return days.map(day => ({
    date: day,
    isToday: isToday(day),
    lessons: [] // Будем заполнять отдельно
  }))
}

// Получить данные недели
export function getWeekData(date: Date): PlannerWeek {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  const days = getWeekDays(date)
  
  return {
    days,
    weekStart: start,
    weekEnd: end
  }
}

// Навигация по неделям
export function getNextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function getPreviousWeek(date: Date): Date {
  return subWeeks(date, 1)
}

// Форматирование даты для отображения
export function formatDate(date: Date, formatStr: string = 'dd.MM.yyyy'): string {
  return format(date, formatStr, { locale: ru })
}

// Получить время из ISO строки в формате HH:mm
export function formatTime(isoString: string): string {
  return format(new Date(isoString), 'HH:mm')
}

// Получить CSS классы для урока в зависимости от статуса
export function getLessonStatusClasses(status: Lesson['status']): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
    case 'completed':
      return 'bg-green-50 border-green-200 text-green-900 hover:bg-green-100'
    case 'cancelled':
      return 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
  }
}

// Проверить, является ли экран узким (мобильный)
export function isMobileScreen(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768 // Tailwind md breakpoint
}
