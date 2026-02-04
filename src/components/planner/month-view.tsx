'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  format 
} from 'date-fns'
import type { Lesson } from './types'

interface MonthViewProps {
  currentDate: Date
  lessons: Lesson[]
  onDayClick: (date: Date) => void
  onLessonClick: (lesson: Lesson) => void
}

// Варианты анимации
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
    },
  },
}

const dayVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
}

export function MonthView({ currentDate, lessons, onDayClick, onLessonClick }: MonthViewProps) {
  // Генерируем дни для отображения (включая дни предыдущего/следующего месяца)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Группируем уроки по датам для быстрого поиска
  const lessonsByDate = useMemo(() => {
    const map = new Map<string, Lesson[]>()
    lessons.forEach(lesson => {
      const dateKey = format(new Date(lesson.startTime), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      existing.push(lesson)
      map.set(dateKey, existing)
    })
    return map
  }, [lessons])

  // Получаем уроки для конкретного дня
  const getLessonsForDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return lessonsByDate.get(dateKey) || []
  }

  // Цвета для статусов уроков
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500'
      case 'confirmed': return 'bg-emerald-500'
      case 'in_progress': return 'bg-orange-500'
      case 'completed': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      case 'rescheduled': return 'bg-purple-500'
      default: return 'bg-gray-400'
    }
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="h-full flex flex-col p-4">
      {/* Заголовки дней недели */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div 
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Сетка дней */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={format(currentDate, 'yyyy-MM')}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr"
        >
          {calendarDays.map((day) => {
            const dayLessons = getLessonsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isTodayDate = isToday(day)
            
            return (
              <motion.div
                key={day.toISOString()}
                variants={dayVariants}
                className={`
                  relative border rounded-lg p-1 min-h-[80px] cursor-pointer transition-colors
                  ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'}
                  ${isTodayDate ? 'border-blue-500 border-2' : 'border-gray-200'}
                `}
                onClick={() => onDayClick(day)}
              >
                {/* Номер дня */}
                <div className={`
                  text-sm font-medium mb-1
                  ${isTodayDate ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Уроки дня */}
                <div className="space-y-0.5 overflow-hidden">
                  {dayLessons.slice(0, 3).map(lesson => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-1 text-[10px] leading-tight truncate rounded px-1 py-0.5 hover:bg-gray-100 transition-colors"
                      style={lesson.labelColor ? { color: lesson.labelColor } : undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        onLessonClick(lesson)
                      }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(lesson.status)}`} />
                      <span className="truncate font-medium">{lesson.title}</span>
                    </div>
                  ))}
                  {dayLessons.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1">
                      +{dayLessons.length - 3} ещё
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
