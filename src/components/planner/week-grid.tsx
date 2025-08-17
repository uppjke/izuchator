'use client'

import React, { useState, useEffect } from 'react'
import { formatDate } from './utils'
import { Icon } from '@/components/ui/icon'
import { Clock } from 'lucide-react'
import type { PlannerWeek, Lesson } from './types'
import { useAuth } from '@/lib/auth-context'
import { useTeacherStudents } from '@/hooks/use-relations'

interface WeekGridProps {
  week: PlannerWeek
  lessons?: Lesson[]
  onEditLesson?: (lesson: Lesson) => void
}

export function WeekGrid({ week, lessons = [], onEditLesson }: WeekGridProps) {
  const { user } = useAuth()
  const { data: studentsData = [] } = useTeacherStudents(user?.id)
  
  // Часы для отображения (00:00 - 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  // Состояние для текущего времени
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Реф для контейнера прокрутки
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Создаем карту студентов по ID для быстрого поиска
  const studentsMap = React.useMemo(() => {
    const map = new Map()
    studentsData.forEach(relation => {
      if (relation.student?.id) {
        map.set(relation.student.id, {
          name: relation.student.full_name || relation.student.email || 'Ученик',
          customName: relation.teacher_custom_name_for_student || null
        })
      }
    })
    return map
  }, [studentsData])
  
  // Стиль статусов: белый фон, цветной бордер и текст
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { card: 'bg-white border border-blue-500 text-blue-700 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'text-blue-600/70', icon: 'text-blue-500' }
      case 'completed':
        return { card: 'bg-white border border-green-500 text-green-700 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'text-green-600/70', icon: 'text-green-500' }
      case 'cancelled':
        return { card: 'bg-white border border-red-500 text-red-700 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'text-red-600/70', icon: 'text-red-500' }
      case 'confirmed':
        return { card: 'bg-white border border-emerald-500 text-emerald-700 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'text-emerald-600/70', icon: 'text-emerald-500' }
      case 'in_progress':
        return { card: 'bg-white border border-orange-500 text-orange-700 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'text-orange-600/70', icon: 'text-orange-500' }
      default:
        return { card: 'bg-white border border-gray-500 text-gray-700 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'text-gray-600/70', icon: 'text-gray-500' }
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
            {week.days.map((day) => {
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
                    const student = studentsMap.get(lesson.student_id)
                    const studentDisplayName = student?.customName || student?.name || 'Неизвестный студент'
                    const statusStyle = getStatusStyle(lesson.status)
                    const startTime = new Date(lesson.start_time)
                    const endTime = new Date(startTime.getTime() + lesson.duration_minutes * 60000)
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`absolute left-1 right-1 rounded-lg cursor-pointer transition-all hover:shadow-md hover:scale-[1.015] overflow-hidden ${statusStyle.card}`}
                        style={{
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                          zIndex: 10,
                          borderColor: lesson.label_color || undefined,
                          // Меняем цвет текста, если выбран пользовательский цвет
                          color: lesson.label_color || undefined
                        }}
                        onClick={() => onEditLesson?.(lesson)}
                      >
                        <div className="p-1.5 h-full flex flex-col overflow-hidden text-[11px]">
                          {(() => {
                            const h = position.height
                            return (
                              <>
                                {/* Title */}
                                <div className={`font-semibold truncate leading-tight ${h < 40 ? 'text-[10px]' : 'text-[11px]'}`}>
                                  {lesson.title}
                                </div>
                                <div className="flex-1 min-h-0" />
                                {/* Breakpoints recalibrated: title always; avatar+name prioritized; time only on taller cards */}
                                {h >= 78 && (
                                  <>
                                    <div className="flex items-center text-[9px] mb-0.5">
                                      <div className={`w-4 h-4 rounded-full ${statusStyle.avatar} flex items-center justify-center text-[8px] leading-none font-medium mr-1 flex-shrink-0`}> 
                                        {studentDisplayName.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate">{studentDisplayName}</span>
                                    </div>
                                    <div className={`flex items-center justify-end ${statusStyle.dim} text-[8px] w-full`}>
                                      <span className="truncate font-medium">
                                        {startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – {endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <Icon icon={Clock} size="xs" className={`ml-1 scale-90 ${statusStyle.icon}`} />
                                    </div>
                                  </>
                                )}
                                {h >= 56 && h < 78 && (
                                  <div className="flex items-center text-[8px]">
                                    <div className={`w-3.5 h-3.5 rounded-full ${statusStyle.avatar} flex items-center justify-center text-[7px] leading-none font-medium mr-1 flex-shrink-0`}>
                                      {studentDisplayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate">{studentDisplayName}</span>
                                  </div>
                                )}
                                {h >= 44 && h < 56 && (
                                  <div className="flex items-center text-[8px]">
                                    <div className={`w-3 h-3 rounded-full ${statusStyle.avatar} flex items-center justify-center text-[7px] leading-none font-medium mr-1 flex-shrink-0`}>
                                      {studentDisplayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate">{studentDisplayName}</span>
                                  </div>
                                )}
                                {h >= 36 && h < 44 && (
                                  <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full ${statusStyle.avatar} flex items-center justify-center text-[7px] leading-none font-medium`} />
                                  </div>
                                )}
                                {/* <36px: only title already rendered */}
                              </>
                            )
                          })()}
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
