'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus } from 'lucide-react'
import { formatDate, formatTime, getLessonStatusClasses } from './utils'
import type { PlannerWeek, Lesson } from './types'

interface WeekViewProps {
  week: PlannerWeek
  lessons: Lesson[]
  onCreateLesson: (date: Date, hour: number) => void
  onEditLesson: (lesson: Lesson) => void
}

export function WeekView({ 
  week, 
  lessons, 
  onCreateLesson, 
  onEditLesson 
}: WeekViewProps) {
  // Часы для отображения (8:00 - 22:00)
  const hours = Array.from({ length: 15 }, (_, i) => i + 8)
  
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
    <Card className="overflow-hidden">
      {/* Сетка календаря */}
      <div className="grid grid-cols-8 gap-px bg-gray-200">
        {/* Заголовок с временем */}
        <div className="bg-white p-3 text-sm font-medium text-gray-500 border-r">
          Время
        </div>
        
        {/* Заголовки дней недели */}
        {week.days.map((day) => (
          <div
            key={day.date.toISOString()}
            className={`bg-white p-3 text-sm font-medium text-center border-r last:border-r-0 ${
              day.isToday ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            <div className="text-xs text-gray-500 uppercase">
              {formatDate(day.date, 'EEE')}
            </div>
            <div className={`text-lg mt-1 ${day.isToday ? 'font-bold' : ''}`}>
              {formatDate(day.date, 'd')}
            </div>
          </div>
        ))}
        
        {/* Строки с часами */}
        {hours.map((hour) => (
          <React.Fragment key={`hour-row-${hour}`}>
            {/* Время */}
            <div className="bg-white p-3 text-sm text-gray-500 text-right border-r">
              {hour}:00
            </div>
            
            {/* Ячейки дней */}
            {week.days.map((day) => {
              const slotLessons = getLessonsForSlot(day.date, hour)
              
              return (
                <div
                  key={`${day.date.toISOString()}-${hour}`}
                  className="bg-white min-h-[60px] relative hover:bg-gray-50 cursor-pointer group border-r last:border-r-0"
                  onClick={() => onCreateLesson(day.date, hour)}
                >
                  {/* Кнопка добавления урока */}
                  {slotLessons.length === 0 && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-6 h-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Icon icon={Plus} size="xs" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Уроки */}
                  <div className="p-1 space-y-1">
                    {slotLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`text-xs p-2 rounded border cursor-pointer transition-colors ${getLessonStatusClasses(lesson.status)}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditLesson(lesson)
                        }}
                      >
                        <div className="font-medium truncate">{lesson.title}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {formatTime(lesson.start_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </Card>
  )
}
