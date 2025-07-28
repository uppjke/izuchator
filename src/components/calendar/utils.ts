// Утилиты для работы с календарем
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { CalendarDay, Lesson } from './types'

// Получить дни недели для календаря
export function getWeekDays(date: Date): CalendarDay[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Неделя начинается с понедельника
  const end = endOfWeek(date, { weekStartsOn: 1 })
  
  const days = eachDayOfInterval({ start, end })
  
  return days.map(day => ({
    date: day,
    isCurrentMonth: true, // Пока все дни считаем текущим месяцем
    isToday: isToday(day),
    lessons: [] // Пока пустые, заполним позже
  }))
}

// Форматирование даты для отображения
export function formatDate(date: Date, formatStr: string = 'dd.MM.yyyy'): string {
  return format(date, formatStr, { locale: ru })
}

// Получить время из ISO строки в формате HH:mm
export function formatTime(isoString: string): string {
  return format(new Date(isoString), 'HH:mm')
}

// Проверить пересекаются ли два урока
export function lessonsOverlap(lesson1: Lesson, lesson2: Lesson): boolean {
  const start1 = new Date(lesson1.start_time)
  const end1 = new Date(start1.getTime() + lesson1.duration_minutes * 60000)
  
  const start2 = new Date(lesson2.start_time)
  const end2 = new Date(start2.getTime() + lesson2.duration_minutes * 60000)
  
  return start1 < end2 && start2 < end1
}

// Получить CSS классы для урока в зависимости от статуса
export function getLessonStatusClasses(status: Lesson['status']): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 border-blue-300 text-blue-900'
    case 'completed':
      return 'bg-green-100 border-green-300 text-green-900'
    case 'cancelled':
      return 'bg-gray-100 border-gray-300 text-gray-600'
    default:
      return 'bg-gray-100 border-gray-300 text-gray-900'
  }
}
