'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { formatDate } from './utils'
import { Icon } from '@/components/ui/icon'
import { Clock } from 'lucide-react'
import type { PlannerWeek, Lesson } from './types'
import { useAuth } from '@/lib/auth-context'

interface WeekGridProps {
  week: PlannerWeek
  lessons?: Lesson[]
  onEditLesson?: (lesson: Lesson) => void
}

export function WeekGrid({ week, lessons = [], onEditLesson }: WeekGridProps) {
  const { user } = useAuth()
  
  // Часы для отображения (00:00 - 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  // Состояние для текущего времени
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Реф для контейнера прокрутки
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Стиль статусов: белый фон + цветной бордер; цвет текста будет от labelColor
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { card: 'bg-white border border-blue-500 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'opacity-70', icon: 'opacity-80' }
      case 'completed':
        return { card: 'bg-white border border-green-500 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'opacity-70', icon: 'opacity-80' }
      case 'cancelled':
        return { card: 'bg-white border border-red-500 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'opacity-70', icon: 'opacity-80' }
      case 'confirmed':
        return { card: 'bg-white border border-emerald-500 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'opacity-70', icon: 'opacity-80' }
      case 'in_progress':
        return { card: 'bg-white border border-orange-500 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'opacity-70', icon: 'opacity-80' }
      default:
        return { card: 'bg-white border border-gray-500 shadow-sm', avatar: 'bg-zinc-900 text-white', dim: 'opacity-70', icon: 'opacity-80' }
    }
  }

  // Функция для получения уроков в конкретный день
  const getLessonsForDay = (dayDate: Date) => {
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.startTime)
      return (
        lessonDate.getDate() === dayDate.getDate() &&
        lessonDate.getMonth() === dayDate.getMonth() &&
        lessonDate.getFullYear() === dayDate.getFullYear()
      )
    })
  }

  // Функция для вычисления позиции и размера карточки урока
  const getLessonPosition = (lesson: Lesson) => {
    const startTime = new Date(lesson.startTime)
    const endTime = new Date(lesson.endTime)
    const hours = startTime.getHours()
    const minutes = startTime.getMinutes()
    
    // Высота одного часа = 64px
    const hourHeight = 64
    const top = (hours * hourHeight) + (minutes / 60) * hourHeight
    
    // Вычисляем длительность урока в минутах из startTime и endTime
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.max(1, Math.floor(durationMs / (1000 * 60))) // Минимум 1 минута
    
    // Максимальная длительность - 12 часов (720 минут)
    const maxDuration = 12 * 60
    const duration = Math.min(durationMinutes, maxDuration)
    const height = (duration / 60) * hourHeight
    
    return { top, height }
  }

  // Элегантная раскладка перекрывающихся занятий (по дням)
  // Идея: для каждого дня вычисляем кластеры пересекающихся интервалов и распределяем их по колонкам,
  // как только интервал завершается — колонка освобождается и может быть переиспользована.
  // Это даёт плотную, но «воздушную» сетку без взаимного наложения.
  const dayLayouts = useMemo(() => {
    const layouts: Record<string, Record<string, { leftPct: number; widthPct: number }>> = {}

    interface EventItem {
      lesson: Lesson
      start: number
      end: number
      pos: { top: number; height: number }
      column: number
      clusterId: number
    }

    week.days.forEach(day => {
      const dayKey = day.date.toISOString().split('T')[0]
      const dayLessons = getLessonsForDay(day.date)
      if (!dayLessons.length) return

      // Подготовим структуру с позициями
      const items: EventItem[] = dayLessons.map(lesson => {
        const pos = getLessonPosition(lesson)
        const start = pos.top
        const end = pos.top + pos.height
        return { lesson, start, end, pos, column: -1, clusterId: -1 }
      })

      // Сортировка по времени начала
      const sorted: EventItem[] = [...items].sort((a,b) => a.start - b.start)
      let active: EventItem[] = []
      let clusterId = 0
      interface Cluster { id: number; events: EventItem[]; maxCols: number }
      const clusters: Cluster[] = []

      sorted.forEach(ev => {
        // Удаляем завершившиеся из active
        active = active.filter(a => a.end > ev.start)
        // Если active пуст – новый кластер
        if (!active.length) {
          clusterId++
          clusters.push({ id: clusterId, events: [], maxCols: 0 })
        }
        const cluster = clusters[clusters.length - 1]
        // Определяем занятые колонки
        const used = new Set(active.map(a => a.column))
        let col = 0
        while (used.has(col)) col++
        ev.column = col
        ev.clusterId = cluster.id
        active.push(ev)
        cluster.events.push(ev)
        if (col + 1 > cluster.maxCols) cluster.maxCols = col + 1
      })

      // Вычисляем проценты ширины/позиции для каждого события
      const map: Record<string, { leftPct: number; widthPct: number }> = {}
      clusters.forEach(cluster => {
        const totalCols = cluster.maxCols
        // Минимальная ширина колонки — если много пересечений, ограничим до 20% и разрешим лёгкое перекрытие через внутренний отступ
        const baseWidth = 100 / totalCols
        cluster.events.forEach(ev => {
          let widthPct = baseWidth
          let leftPct = ev.column * baseWidth
          // Адаптивное «сжатие» при очень широких кластерах (>4 колонки) – оставляем небольшой визуальный зазор
            if (totalCols >= 4) {
            const shrink = 2 // % от ширины колонки
            widthPct = baseWidth - shrink
            leftPct = ev.column * baseWidth + shrink/2
          }
          // Гарантируем границы [0,100]
          if (leftPct + widthPct > 100) widthPct = 100 - leftPct
          map[ev.lesson.id] = { leftPct, widthPct }
        })
      })

      layouts[dayKey] = map
    })

    return layouts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, week])

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
                    const dayKey = day.date.toISOString().split('T')[0]
                    const layoutInfo = dayLayouts[dayKey]?.[lesson.id]
                    
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
                    
                    const statusStyle = getStatusStyle(lesson.status || 'scheduled')
                    const startTime = new Date(lesson.startTime)
                    const endTime = new Date(lesson.endTime)
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`absolute rounded-lg cursor-pointer transition-all hover:shadow-md hover:scale-[1.015] overflow-hidden ${statusStyle.card} ${!lesson.labelColor ? 'text-gray-800' : ''}`}
                        style={{
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                          // Если есть данные раскладки – используем их, иначе fallback на полную ширину
                          left: layoutInfo ? `${layoutInfo.leftPct}%` : '4px',
                          width: layoutInfo ? `${layoutInfo.widthPct}%` : 'calc(100% - 8px)',
                          zIndex: 10,
                          borderColor: lesson.labelColor || undefined,
                          backgroundClip: 'padding-box',
                          color: lesson.labelColor || undefined
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
