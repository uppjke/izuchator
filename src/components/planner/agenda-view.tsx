'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, formatTime, getLessonStatusClasses } from './utils'
import type { PlannerWeek, Lesson } from './types'

interface AgendaViewProps {
  week: PlannerWeek
  lessons: Lesson[]
  onCreateLesson: (date: Date) => void
  onEditLesson: (lesson: Lesson) => void
}

export function AgendaView({ 
  week, 
  lessons, 
  onCreateLesson, 
  onEditLesson 
}: AgendaViewProps) {
  const [selectedDay, setSelectedDay] = useState(
    week.days.find(day => day.isToday) || week.days[0]
  )
  
  // Получить уроки для выбранного дня
  const dayLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.start_time)
    return (
      lessonDate.getDate() === selectedDay.date.getDate() &&
      lessonDate.getMonth() === selectedDay.date.getMonth() &&
      lessonDate.getFullYear() === selectedDay.date.getFullYear()
    )
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  
  const goToPreviousDay = () => {
    const currentIndex = week.days.findIndex(day => 
      day.date.getTime() === selectedDay.date.getTime()
    )
    if (currentIndex > 0) {
      setSelectedDay(week.days[currentIndex - 1])
    }
  }
  
  const goToNextDay = () => {
    const currentIndex = week.days.findIndex(day => 
      day.date.getTime() === selectedDay.date.getTime()
    )
    if (currentIndex < week.days.length - 1) {
      setSelectedDay(week.days[currentIndex + 1])
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Навигация по дням */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousDay}
              disabled={week.days[0].date.getTime() === selectedDay.date.getTime()}
            >
              <Icon icon={ChevronLeft} size="sm" />
            </Button>
            
            <h3 className="text-lg font-semibold">
              {formatDate(selectedDay.date, 'EEEE, d MMMM')}
            </h3>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextDay}
              disabled={week.days[6].date.getTime() === selectedDay.date.getTime()}
            >
              <Icon icon={ChevronRight} size="sm" />
            </Button>
          </div>
          
          <Button 
            onClick={() => onCreateLesson(selectedDay.date)}
            size="sm"
          >
            <Icon icon={Plus} size="sm" />
          </Button>
        </div>
      </Card>
      
      {/* Список событий */}
      <div className="space-y-3">
        {dayLessons.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              На этот день нет запланированных уроков
            </div>
            <Button 
              onClick={() => onCreateLesson(selectedDay.date)}
              variant="outline"
            >
              <Icon icon={Plus} size="sm" className="mr-2" />
              Добавить урок
            </Button>
          </Card>
        ) : (
          dayLessons.map((lesson) => (
            <Card 
              key={lesson.id}
              className={`p-4 cursor-pointer transition-colors ${getLessonStatusClasses(lesson.status)}`}
              onClick={() => onEditLesson(lesson)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{lesson.title}</h4>
                  <div className="text-xs mt-1 opacity-75">
                    {formatTime(lesson.start_time)} • {lesson.duration_minutes} мин
                  </div>
                </div>
                
                <div className="text-xs px-2 py-1 rounded border bg-white/50">
                  {lesson.status === 'scheduled' && 'Запланирован'}
                  {lesson.status === 'completed' && 'Завершен'}
                  {lesson.status === 'cancelled' && 'Отменен'}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
