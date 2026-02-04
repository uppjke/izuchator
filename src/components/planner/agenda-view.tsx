'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from './utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Icon } from '@/components/ui/icon'
import { Clock, CalendarOff } from 'lucide-react'
import type { PlannerWeek, Lesson } from './types'
import { useAuth } from '@/lib/auth-context'

// Варианты анимаций
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
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

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
  },
}

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
  const { user } = useAuth()
  
  const [selectedDay, setSelectedDay] = useState(
    week.days.find(day => day.isToday) ?? week.days[0]
  )
  
  // Отслеживаем изменения недели и автоматически выбираем сегодняшний день только при смене недели
  useEffect(() => {
    const todayInWeek = week.days.find(day => day.isToday)
    // Проверяем, что выбранный день не входит в текущую неделю (значит, сменилась неделя)
    const isSelectedDayInCurrentWeek = selectedDay && week.days.some(day => 
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
    else if (!isSelectedDayInCurrentWeek && !todayInWeek && week.days[0]) {
      setSelectedDay(week.days[0])
    }
  }, [week, selectedDay, forceToday])
  
  // Получаем уроки для выбранного дня
  const dayLessons = selectedDay ? lessons.filter(lesson => {
    const lessonDate = new Date(lesson.startTime)
    return (
      lessonDate.getDate() === selectedDay.date.getDate() &&
      lessonDate.getMonth() === selectedDay.date.getMonth() &&
      lessonDate.getFullYear() === selectedDay.date.getFullYear()
    )
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) : []
  
  // Сопоставление дней недели с двухбуквенными сокращениями
  const getDayAbbr = (date: Date): string => {
    const dayIndex = date.getDay()
    const dayAbbrs = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
    return dayAbbrs[dayIndex] ?? ''
  }

  if (!selectedDay) {
    return <div className="h-full flex items-center justify-center">Загрузка...</div>
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
        <AnimatePresence mode="wait">
          {dayLessons.length === 0 ? (
            <motion.div 
              key="empty"
              variants={emptyStateVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="flex items-center justify-center min-h-[200px]"
            >
              <div className="text-center text-gray-500">
                <Icon icon={CalendarOff} size="xl" className="mx-auto mb-3 text-gray-300" />
                <div className="text-md font-medium mb-1">
                  Занятий не запланировано
                </div>
                <div className="text-sm text-gray-400">
                  На этот день нет уроков
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key={selectedDay?.date.toISOString()}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {dayLessons.map((lesson) => {
                const lessonDate = new Date(lesson.startTime)
                const endTime = new Date(lesson.endTime)
                
                // Получаем информацию об ученике из связи
                const relation = (lesson as { relation?: { teacherId?: string; studentId?: string; teacherName?: string; studentName?: string; teacher?: { name?: string; email?: string }; student?: { name?: string; email?: string } } }).relation
                let studentDisplayName = 'Неизвестный ученик'
                
                if (relation) {
                  // Определяем, кто текущий пользователь - преподаватель или ученик
                  const isTeacher = relation.teacherId === user?.id
                  
                  if (isTeacher) {
                    // Если текущий пользователь - преподаватель, показываем ученика
                    studentDisplayName = relation.studentName || relation.student?.name || relation.student?.email || 'Ученик'
                  } else {
                    // Если текущий пользователь - ученик, показываем преподавателя
                    studentDisplayName = relation.teacherName || relation.teacher?.name || relation.teacher?.email || 'Преподаватель'
                  }
                }
                
                // Функция для получения статуса и цвета
                const getStatusInfo = (status: string) => {
                  switch (status) {
                    case 'scheduled':
                      return { 
                        label: 'Запланировано', 
                        color: 'bg-blue-100 text-blue-700 border-blue-200'
                      }
                    case 'completed':
                      return { 
                        label: 'Завершено', 
                        color: 'bg-green-100 text-green-700 border-green-200'
                      }
                    case 'cancelled':
                      return { 
                        label: 'Отменено', 
                        color: 'bg-red-100 text-red-700 border-red-200'
                      }
                    case 'confirmed':
                      return { 
                        label: 'Подтверждено', 
                        color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }
                    case 'in_progress':
                      return { 
                        label: 'В процессе', 
                        color: 'bg-orange-100 text-orange-700 border-orange-200'
                      }
                    default:
                      return { 
                        label: status, 
                        color: 'bg-gray-100 text-gray-700 border-gray-200'
                      }
                  }
                }
                
                const statusInfo = getStatusInfo(lesson.status || 'scheduled')
                
                return (
                  <motion.div
                    key={lesson.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
                      onClick={() => onEditLesson(lesson)}
                      style={lesson.labelColor ? { borderColor: lesson.labelColor, color: lesson.labelColor } : undefined}
                    >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between pr-2">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          <span className="truncate max-w-[160px] sm:max-w-none" style={lesson.labelColor ? { color: lesson.labelColor } : undefined}>{lesson.title}</span>
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
                      <div className="space-y-3">
                        {/* Студент */}
                        <div className="flex items-center">
                          <UserAvatar 
                            user={{ 
                              name: studentDisplayName,
                              avatar_url: null
                            }} 
                            size="sm" 
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            {studentDisplayName}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-end">
                          {/* Статус */}
                          <div className={`text-xs px-2 py-1 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
  )
}
