'use client'

import React, { useState, useEffect } from 'react'
import { formatDate } from './utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Clock, BookOpen, DollarSign, User } from 'lucide-react'
import type { PlannerWeek, Lesson } from './types'

interface AgendaViewProps {
  week: PlannerWeek
  lessons: Lesson[]
  onCreateLesson?: (date: Date) => void // Делаем опциональным, так как не используется
  onEditLesson: (lesson: Lesson) => void
  forceToday?: boolean // Флаг для принудительного выбора сегодняшнего дня
}

export function AgendaView({ 
  week, 
  lessons,
  onEditLesson,
  forceToday = false
}: AgendaViewProps) {
  const [selectedDay, setSelectedDay] = useState(
    week.days.find(day => day.isToday) || week.days[0]
  )
  
  // Отслеживаем изменения недели и автоматически выбираем сегодняшний день только при смене недели
  useEffect(() => {
    const todayInWeek = week.days.find(day => day.isToday)
    // Проверяем, что выбранный день не входит в текущую неделю (значит, сменилась неделя)
    const isSelectedDayInCurrentWeek = week.days.some(day => 
      day.date.getTime() === selectedDay.date.getTime()
    )
    
    // Принудительно выбираем сегодня, если установлен флаг forceToday
    if (forceToday && todayInWeek) {
      setSelectedDay(todayInWeek)
    }
    // Автоматически переключаемся на сегодня только если:
    // 1. Сегодня есть в текущей неделе
    // 2. Выбранный день не входит в текущую неделю (т.е. произошла смена недели)
    else if (todayInWeek && !isSelectedDayInCurrentWeek) {
      setSelectedDay(todayInWeek)
    }
    // Если выбранный день не входит в новую неделю, но сегодня тоже нет, выбираем первый день
    else if (!isSelectedDayInCurrentWeek && !todayInWeek) {
      setSelectedDay(week.days[0])
    }
  }, [week, selectedDay, forceToday])
  
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
    <div className="h-full flex flex-col border border-gray-200/60 rounded-lg overflow-hidden">
      {/* Заголовок с днями недели для переключения - зафиксирован */}
      <div className="flex-shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gradient-to-r from-white/60 via-white/50 to-white/60 backdrop-blur-md backdrop-saturate-180">
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

      {/* Контент выбранного дня - прокручиваемый */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {dayLessons.length === 0 ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center text-gray-500">
              <div className="text-md font-medium mb-2">
                Занятий не запланировано
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
              {dayLessons.map((lesson) => {
                const lessonDate = new Date(lesson.start_time)
                const endTime = new Date(lessonDate.getTime() + lesson.duration_minutes * 60000)
                
                return (
                  <Card 
                    key={lesson.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                    onClick={() => onEditLesson(lesson)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {lesson.title}
                        </CardTitle>
                        <div className="flex items-center text-sm text-gray-500">
                          <Icon icon={Clock} size="xs" />
                          <span className="ml-1">
                            {lessonDate.toLocaleTimeString('ru-RU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {endTime.toLocaleTimeString('ru-RU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {lesson.description && (
                        <div className="flex items-start mb-3">
                          <Icon icon={BookOpen} size="xs" />
                          <p className="text-sm text-gray-600 ml-2 leading-relaxed">
                            {lesson.description}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                          <Icon icon={User} size="xs" />
                          <span className="ml-1">Студент: {lesson.student_id}</span>
                        </div>
                        
                        {lesson.price && (
                          <div className="flex items-center text-green-600 font-medium">
                            <Icon icon={DollarSign} size="xs" />
                            <span className="ml-1">{lesson.price} ₽</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          Длительность: {lesson.duration_minutes} мин
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          lesson.status === 'scheduled' 
                            ? 'bg-blue-100 text-blue-700' 
                            : lesson.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {lesson.status === 'scheduled' ? 'Запланировано' : 
                           lesson.status === 'completed' ? 'Завершено' : 
                           lesson.status}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
  )
}
