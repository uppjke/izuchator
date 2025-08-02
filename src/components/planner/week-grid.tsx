'use client'

import React from 'react'
import { formatDate } from './utils'
import type { PlannerWeek } from './types'

interface WeekGridProps {
  week: PlannerWeek
}

export function WeekGrid({ week }: WeekGridProps) {
  // Часы для отображения (00:00 - 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  // Сопоставление дней недели с двухбуквенными сокращениями
  const getDayAbbr = (date: Date): string => {
    const dayIndex = date.getDay()
    const dayAbbrs = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
    return dayAbbrs[dayIndex]
  }

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-lg overflow-hidden m-4">
      {/* Фиксированный заголовок с днями недели */}
      <div className="flex-none grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-200">
        {/* Пустая ячейка для времени */}
        <div className="bg-gray-50 p-3 text-sm font-medium text-gray-500" />
        
        {/* Заголовки дней */}
        {week.days.map((day) => (
          <div
            key={day.date.toISOString()}
            className={`p-3 text-sm font-medium text-center border-l border-gray-200 ${
              day.isToday ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700'
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
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr]">
        {hours.map((hour, hourIndex) => (
          <React.Fragment key={hour}>
            {/* Время */}
            <div className={`bg-gray-50 p-3 h-16 flex items-center justify-center text-sm text-gray-500 font-medium ${
              hourIndex > 0 ? 'border-t border-gray-200' : ''
            }`}>
              {hour.toString().padStart(2, '0')}:00
            </div>
            
            {/* Ячейки дней */}
            {week.days.map((day) => (
              <div
                key={`${day.date.toISOString()}-${hour}`}
                className={`h-16 bg-white border-l border-gray-200 ${
                  hourIndex > 0 ? 'border-t border-gray-200' : ''
                }`}
              />
            ))}
          </React.Fragment>
        ))}
        </div>
      </div>
    </div>
  )
}
