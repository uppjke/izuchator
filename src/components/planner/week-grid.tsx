'use client'

import React, { useState, useEffect } from 'react'
import { formatDate } from './utils'
import type { PlannerWeek } from './types'

interface WeekGridProps {
  week: PlannerWeek
}

export function WeekGrid({ week }: WeekGridProps) {
  // Часы для отображения (00:00 - 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  // Состояние для текущего времени
  const [currentTime, setCurrentTime] = useState(new Date())
  
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
      <div className="flex-1 overflow-y-auto relative">
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
                    zIndex: 9999
                  }}
                >
                  {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                </div>
              )}
            </div>
            
            {/* Ячейки дней */}
            {week.days.map((day) => (
              <div
                key={`${day.date.toISOString()}-${hour}`}
                className={`h-16 bg-white border-l border-gray-200 relative ${
                  hourIndex > 0 ? 'border-t border-gray-200' : ''
                }`}
              >
              </div>
            ))}
          </React.Fragment>
        ))}
        </div>
      </div>
    </div>
  )
}
