'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  startOfYear,
  eachMonthOfInterval,
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  format,
  addYears
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Lesson } from './types'

interface YearViewProps {
  currentDate: Date
  lessons: Lesson[]
  onMonthClick: (date: Date) => void
}

// Варианты анимации
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const monthVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
}

export function YearView({ currentDate, lessons, onMonthClick }: YearViewProps) {
  // Генерируем все месяцы года
  const months = useMemo(() => {
    const yearStart = startOfYear(currentDate)
    const yearEnd = addYears(yearStart, 1)
    return eachMonthOfInterval({ start: yearStart, end: yearEnd }).slice(0, 12)
  }, [currentDate])

  // Группируем уроки по месяцам для быстрого подсчёта
  const lessonsByMonth = useMemo(() => {
    const map = new Map<string, number>()
    lessons.forEach(lesson => {
      const monthKey = format(new Date(lesson.startTime), 'yyyy-MM')
      const count = map.get(monthKey) || 0
      map.set(monthKey, count + 1)
    })
    return map
  }, [lessons])

  // Получаем количество уроков в месяце
  const getLessonsCount = (month: Date) => {
    const monthKey = format(month, 'yyyy-MM')
    return lessonsByMonth.get(monthKey) || 0
  }

  // Генерируем мини-календарь для месяца
  const getMiniCalendarDays = (month: Date) => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }

  // Проверяем, есть ли уроки в этот день
  const hasLessonsOnDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return lessons.some(lesson => 
      format(new Date(lesson.startTime), 'yyyy-MM-dd') === dateKey
    )
  }

  const weekDays = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В']

  return (
    <div className="h-full overflow-y-auto p-4">
      <AnimatePresence mode="wait">
        <motion.div 
          key={format(currentDate, 'yyyy')}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {months.map(month => {
            const lessonsCount = getLessonsCount(month)
            const miniDays = getMiniCalendarDays(month)
            const isCurrentMonth = isSameMonth(month, new Date())
            
            // Форматируем название месяца с заглавной буквы
            const monthName = format(month, 'LLLL', { locale: ru })
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
            
            return (
              <motion.div
                key={month.toISOString()}
                variants={monthVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  border rounded-xl p-3 cursor-pointer transition-colors
                  ${isCurrentMonth ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'}
                `}
                onClick={() => onMonthClick(month)}
              >
                {/* Заголовок месяца */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-semibold ${isCurrentMonth ? 'text-blue-600' : 'text-gray-900'}`}>
                    {capitalizedMonth}
                  </h3>
                  {lessonsCount > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      {lessonsCount}
                    </span>
                  )}
                </div>

                {/* Мини-календарь */}
                <div className="grid grid-cols-7 gap-px text-[8px]">
                  {/* Заголовки дней */}
                  {weekDays.map((day, idx) => (
                    <div key={idx} className="text-center text-gray-400 font-medium py-0.5">
                      {day}
                    </div>
                  ))}
                  
                  {/* Дни месяца */}
                  {miniDays.map((day, idx) => {
                    const inMonth = isSameMonth(day, month)
                    const isTodayDate = isToday(day)
                    const hasLessons = hasLessonsOnDay(day)
                    
                    return (
                      <div
                        key={idx}
                        className={`
                          text-center py-0.5 rounded-sm relative
                          ${!inMonth ? 'text-gray-300' : 'text-gray-700'}
                          ${isTodayDate ? 'bg-blue-500 text-white font-bold' : ''}
                        `}
                      >
                        {format(day, 'd')}
                        {hasLessons && !isTodayDate && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
