'use client'

import React, { useState, useEffect } from 'react'
import { formatDate } from './utils'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Icon } from '@/components/ui/icon'
import { Clock } from 'lucide-react'
import type { PlannerWeek, Lesson } from './types'

interface WeekGridProps {
  week: PlannerWeek
  lessons?: Lesson[]
  onEditLesson?: (lesson: Lesson) => void
}

export function WeekGrid({ week, lessons = [], onEditLesson }: WeekGridProps) {
  // Часы для отображения (00:00 - 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  // Состояние для текущего времени
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Реф для контейнера прокрутки
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Тестовые данные студентов (те же что в agenda-view)
  const testStudents = {
    student1: { name: 'Анна Петрова', customName: 'Аня' },
    student2: { name: 'Иван Сидоров', customName: null },
    student3: { name: 'Мария Козлова', customName: 'Маша' },
    student4: { name: 'Дмитрий Волков', customName: 'Дима' },
    student5: { name: 'Елена Новикова', customName: null },
    student6: { name: 'Алексей Морозов', customName: 'Леша' },
    student7: { name: 'Софья Романова', customName: 'Соня' },
    student8: { name: 'Николай Федоров', customName: 'Коля' },
    student9: { name: 'Татьяна Лебедева', customName: null },
    student10: { name: 'Максим Орлов', customName: 'Макс' }
  }
  
  // Функция для получения цвета статуса (эффект цветного стекла)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/80 backdrop-blur-sm border border-blue-400/60 text-white shadow-lg'
      case 'completed':
        return 'bg-green-500/80 backdrop-blur-sm border border-green-400/60 text-white shadow-lg'
      case 'cancelled':
        return 'bg-red-500/80 backdrop-blur-sm border border-red-400/60 text-white shadow-lg'
      case 'confirmed':
        return 'bg-emerald-500/80 backdrop-blur-sm border border-emerald-400/60 text-white shadow-lg'
      case 'in_progress':
        return 'bg-orange-500/80 backdrop-blur-sm border border-orange-400/60 text-white shadow-lg'
      default:
        return 'bg-gray-500/80 backdrop-blur-sm border border-gray-400/60 text-white shadow-lg'
    }
  }

  // Функция для получения уроков в конкретный день
  const getLessonsForDay = (dayDate: Date) => {
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start_time)
      return (
        lessonDate.getDate() === dayDate.getDate() &&
        lessonDate.getMonth() === dayDate.getMonth() &&
        lessonDate.getFullYear() === dayDate.getFullYear()
      )
    })
  }

  // Функция для вычисления позиции и размера карточки урока
  const getLessonPosition = (lesson: Lesson) => {
    const startTime = new Date(lesson.start_time)
    const hours = startTime.getHours()
    const minutes = startTime.getMinutes()
    
    // Высота одного часа = 64px
    const hourHeight = 64
    const top = (hours * hourHeight) + (minutes / 60) * hourHeight
    
    // Максимальная длительность - 8 часов (480 минут)
    const maxDuration = 8 * 60
    const duration = Math.min(lesson.duration_minutes, maxDuration)
    const height = (duration / 60) * hourHeight
    
    return { top, height }
  }

  // Обновляем время каждую секунду для точной синхронизации
  useEffect(() => {
    // Устанавливаем текущее время сразу
    setCurrentTime(new Date())
    
    const updateTime = () => {
      setCurrentTime(new Date())
    }
    
    const interval = setInterval(updateTime, 1000)
    
    // Обработчики для мобильных устройств и планшетов
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTime() // Обновляем время при возврате на вкладку
      }
    }
    
    const handleFocus = () => {
      updateTime() // Обновляем время при фокусе на окне
    }
    
    // Добавляем слушатели событий
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', updateTime) // Для мобильных браузеров

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', updateTime)
    }
  }, [])
  
  // Сопоставление дней недели с двухбуквенными сокращениями
  const getDayAbbr = (date: Date): string => {
    const dayIndex = date.getDay()
    const dayAbbrs = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
    return dayAbbrs[dayIndex]
  }
  
  // Получаем текущее время для отображения индикатора
  const currentHour = currentTime.getHours()
  const currentMinutes = currentTime.getMinutes()
  
  // Проверяем, находится ли текущая дата в отображаемой неделе
  const isCurrentWeek = week.days.some(day => {
    const dayDate = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate())
    const currentDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate())
    return dayDate.getTime() === currentDate.getTime()
  })
  
  // Автоскролл к текущему времени только при первой загрузке
  useEffect(() => {
    if (scrollContainerRef.current && isCurrentWeek) {
      const container = scrollContainerRef.current
      const now = new Date() // Получаем текущее время внутри эффекта
      const currentHour = now.getHours()
      const currentMinutes = now.getMinutes()
      
      // Вычисляем позицию текущего времени (64px = высота ячейки)
      const timePosition = (currentHour * 64) + (currentMinutes / 60) * 64
      
      // Вычисляем позицию для центрирования (половина высоты контейнера)
      const containerHeight = container.clientHeight
      const scrollPosition = timePosition - (containerHeight / 2)
      
      // Устанавливаем позицию скролла мгновенно только один раз
      container.scrollTop = Math.max(0, scrollPosition)
    }
  }, [isCurrentWeek]) // Только при изменении недели
  
  // Вычисляем позицию индикатора времени в процентах от высоты ячейки
  const timeIndicatorPosition = (currentMinutes / 60) * 100

  return (
    <div className="h-full flex flex-col border border-gray-200/60 rounded-lg overflow-hidden m-4">
      {/* Фиксированный заголовок с днями недели */}
      <div className="flex-none grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-200 bg-gradient-to-r from-white/60 via-white/50 to-white/60 backdrop-blur-md backdrop-saturate-180">
        {/* Пустая ячейка для времени */}
        <div className="bg-gray-50/80 p-3 text-sm font-medium text-gray-500" />
        
        {/* Заголовки дней */}
        {week.days.map((day) => (
          <div
            key={day.date.toISOString()}
            className={`p-3 text-sm font-medium text-center border-l border-gray-200 ${
              day.isToday ? 'bg-blue-50/80 text-blue-700' : 'bg-gray-50/80 text-gray-700'
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

      {/* Прокручиваемая сетка с часами */}
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] relative">
        {/* Глобальный индикатор времени поверх всей сетки */}
        {isCurrentWeek && currentHour >= 0 && currentHour < 24 && (
          <div 
            className="absolute bg-red-500 shadow-sm pointer-events-none"
            style={{ 
              left: '60px', // Начинаем после столбца времени
              right: '0',
              height: '2px',
              top: `${(currentHour * 64) + (currentMinutes / 60) * 64 - 1}px`, // 64px = высота ячейки
              boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)',
              zIndex: 9999
            }}
          />
        )}
        
        {hours.map((hour, hourIndex) => (
          <React.Fragment key={hour}>
            {/* Время */}
            <div className={`bg-gray-50/80 p-3 h-16 flex items-center justify-center text-sm text-gray-500 font-medium relative ${
              hourIndex > 0 ? 'border-t border-gray-200' : ''
            }`}>
              {hour.toString().padStart(2, '0')}:00
              
              {/* Отображение текущего времени в столбце времени */}
              {isCurrentWeek && hour === currentHour && (
                <div 
                  className="absolute text-xs font-medium text-white bg-red-500 px-2 py-1 rounded-full right-0 whitespace-nowrap"
                  style={{ 
                    top: `calc(${timeIndicatorPosition}% - 13px)`,
                    boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)',
                    zIndex: 9999,
                    width: '48px', // Фиксированная ширина для HH:MM формата
                    textAlign: 'center'
                  }}
                >
                  {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                </div>
              )}
            </div>
            
            {/* Ячейки дней */}
            {week.days.map((day, dayIndex) => {
              const dayLessons = getLessonsForDay(day.date)
              
              return (
                <div
                  key={`${day.date.toISOString()}-${hour}`}
                  className={`h-16 bg-white border-l border-gray-200 relative ${
                    hourIndex > 0 ? 'border-t border-gray-200' : ''
                  }`}
                >
                  {/* Карточки уроков - отображаем только для первого часа каждого дня */}
                  {hourIndex === 0 && dayLessons.map((lesson) => {
                    const position = getLessonPosition(lesson)
                    const student = testStudents[lesson.student_id as keyof typeof testStudents]
                    const studentDisplayName = student?.customName || student?.name || 'Неизвестный студент'
                    const statusColor = getStatusColor(lesson.status)
                    const startTime = new Date(lesson.start_time)
                    const endTime = new Date(startTime.getTime() + lesson.duration_minutes * 60000)
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`absolute left-1 right-1 rounded-lg cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] overflow-hidden ${statusColor}`}
                        style={{
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                          zIndex: 10
                        }}
                        onClick={() => onEditLesson?.(lesson)}
                      >
                        <div className="p-1.5 h-full flex flex-col">
                          {/* Заголовок урока - всегда видимый */}
                          <div className="font-semibold text-white text-xs truncate leading-tight">
                            {lesson.title}
                          </div>
                          
                          {/* Spacer для выравнивания контента */}
                          <div className="flex-1 min-h-0" />
                          
                          {/* Приоритет: 1) Аватар + имя, 2) Время */}
                          
                          {/* Для карточек от 64px - показываем аватар + имя */}
                          {position.height >= 64 && (
                            <div className="flex items-center text-white text-[9px] mb-1">
                              <UserAvatar 
                                user={{ 
                                  name: studentDisplayName,
                                  avatar_url: null
                                }} 
                                size="sm"
                                className={`${position.height >= 80 ? 'w-4 h-4' : 'w-3 h-3'} text-[7px] flex-shrink-0`}
                              />
                              <span className="ml-1 truncate text-[8px]">
                                {studentDisplayName}
                              </span>
                            </div>
                          )}
                          
                          {/* Время - показываем только если есть место после аватара */}
                          {position.height >= 90 && (
                            <div className="flex items-center text-white/90 text-[8px]">
                              <Icon icon={Clock} size="xs" />
                              <span className="ml-1 truncate">
                                {startTime.toLocaleTimeString('ru-RU', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - {endTime.toLocaleTimeString('ru-RU', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          )}
                          
                          {/* Для маленьких карточек (50-64px) - только инициал */}
                          {position.height >= 50 && position.height < 64 && (
                            <div className="flex items-center justify-between text-white/90 text-[8px]">
                              <div className="w-2.5 h-2.5 rounded-full bg-black/40 flex items-center justify-center text-[7px] font-bold text-white">
                                {studentDisplayName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[7px]">
                                {startTime.toLocaleTimeString('ru-RU', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </React.Fragment>
        ))}
        </div>
      </div>
    </div>
  )
}
