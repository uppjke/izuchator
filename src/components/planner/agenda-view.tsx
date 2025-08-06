'use client'

import React, { useState, useEffect } from 'react'
import { formatDate } from './utils'
import type { PlannerWeek, Lesson } from './types'

interface AgendaViewProps {
  week: PlannerWeek
  lessons: Lesson[]
  onCreateLesson: (date: Date) => void
  onEditLesson: (lesson: Lesson) => void
}

export function AgendaView({ 
  week, 
  lessons 
}: AgendaViewProps) {
  const [selectedDay, setSelectedDay] = useState(
    week.days.find(day => day.isToday) || week.days[0]
  )
  
  // Отслеживаем изменения недели и автоматически выбираем сегодняшний день если он есть в новой неделе
  useEffect(() => {
    const todayInWeek = week.days.find(day => day.isToday)
    if (todayInWeek) {
      setSelectedDay(todayInWeek)
    }
  }, [week])
  
  // Получаем уроки для выбранного дня
  const dayLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.start_time)
    return (
      lessonDate.getDate() === selectedDay.date.getDate() &&
      lessonDate.getMonth() === selectedDay.date.getMonth() &&
      lessonDate.getFullYear() === selectedDay.date.getFullYear()
    )
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  
  // Сопоставление дней недели с двухбуквенными сокращениями
  const getDayAbbr = (date: Date): string => {
    const dayIndex = date.getDay()
    const dayAbbrs = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
    return dayAbbrs[dayIndex]
  }

  return (
    <div className="space-y-4">
      <div className="h-full flex flex-col border border-gray-200/60 rounded-lg overflow-hidden">
        {/* Заголовок с днями недели для переключения */}
        <div className="flex-none grid grid-cols-7 border-b border-gray-200 bg-gradient-to-r from-white/60 via-white/50 to-white/60 backdrop-blur-md backdrop-saturate-180">
          {week.days.map((day) => (
            <div
              key={day.date.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`p-3 text-sm font-medium text-center border-l border-gray-200 first:border-l-0 transition-colors cursor-pointer ${
                selectedDay.date.getTime() === day.date.getTime()
                  ? 'bg-blue-100/80 text-blue-800'
                  : day.isToday 
                    ? 'bg-blue-50/80 text-blue-700' 
                    : 'bg-gray-50/80 text-gray-700 hover:bg-gray-100/80'
              }`}
            >
              <div className="text-lg font-semibold">
                {formatDate(day.date, 'd')}
              </div>
              <div className="text-xs text-gray-500 uppercase mt-1">
                {getDayAbbr(day.date)}
              </div>
            </div>
          ))}
        </div>

        {/* Контент выбранного дня */}
        <div className="flex-1 p-4">
          {dayLessons.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">
                  Занятий не запланировано
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Здесь будет список уроков */}
              <div className="text-center text-gray-500">
                Найдено уроков: {dayLessons.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
