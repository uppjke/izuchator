'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getWeekDays, formatDate, formatTime, getLessonStatusClasses } from './utils'
import type { Lesson } from './types'

interface CalendarProps {
  lessons?: Lesson[]
  onCreateLesson?: (date: Date, hour: number) => void
  onEditLesson?: (lesson: Lesson) => void
}

export function Calendar({ 
  lessons = [], 
  onCreateLesson,
  onEditLesson 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Получаем дни недели
  const weekDays = getWeekDays(currentDate)
  
  // Часы для отображения (8:00 - 22:00)
  const hours = Array.from({ length: 15 }, (_, i) => i + 8)
  
  // Переключение недели
  const goToNextWeek = () => {
    const nextWeek = new Date(currentDate)
    nextWeek.setDate(currentDate.getDate() + 7)
    setCurrentDate(nextWeek)
  }
  
  const goToPrevWeek = () => {
    const prevWeek = new Date(currentDate)
    prevWeek.setDate(currentDate.getDate() - 7)
    setCurrentDate(prevWeek)
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  // Получить уроки для конкретного дня и часа
  const getLessonsForSlot = (date: Date, hour: number): Lesson[] => {
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start_time)
      return (
        lessonDate.getDate() === date.getDate() &&
        lessonDate.getMonth() === date.getMonth() &&
        lessonDate.getFullYear() === date.getFullYear() &&
        lessonDate.getHours() === hour
      )
    })
  }
  
  return (
    <Card className="p-4">
      {/* Заголовок с навигацией */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {formatDate(weekDays[0].date, 'dd MMM')} - {formatDate(weekDays[6].date, 'dd MMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Сегодня
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Сетка календаря */}
      <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Заголовок с часами */}
        <div className="bg-white p-2 text-sm font-medium text-gray-500">
          Время
        </div>
        
        {/* Заголовки дней недели */}
        {weekDays.map((day) => (
          <div
            key={day.date.toISOString()}
            className={`bg-white p-2 text-sm font-medium text-center ${
              day.isToday ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            <div>{formatDate(day.date, 'EEE')}</div>
            <div className={`text-lg ${day.isToday ? 'font-bold' : ''}`}>
              {formatDate(day.date, 'd')}
            </div>
          </div>
        ))}
        
        {/* Строки с часами */}
        {hours.map((hour) => (
          <React.Fragment key={`hour-row-${hour}`}>
            {/* Время */}
            <div className="bg-white p-2 text-sm text-gray-500 text-right border-r">
              {hour}:00
            </div>
            
            {/* Ячейки дней */}
            {weekDays.map((day) => {
              const slotLessons = getLessonsForSlot(day.date, hour)
              
              return (
                <div
                  key={`${day.date.toISOString()}-${hour}`}
                  className="bg-white p-1 min-h-[60px] relative hover:bg-gray-50 cursor-pointer group"
                  onClick={() => onCreateLesson?.(day.date, hour)}
                >
                  {/* Кнопка добавления урока */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1">
                    <Button size="sm" variant="ghost" className="w-6 h-6 p-0">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Уроки */}
                  {slotLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`text-xs p-1 rounded border mb-1 cursor-pointer ${getLessonStatusClasses(lesson.status)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditLesson?.(lesson)
                      }}
                    >
                      <div className="font-medium truncate">{lesson.title}</div>
                      <div className="text-xs opacity-75">
                        {formatTime(lesson.start_time)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </Card>
  )
}
