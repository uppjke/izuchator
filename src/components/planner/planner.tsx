'use client'

import React, { useState } from 'react'
import { PlannerHeader } from './planner-header'
import { getNextWeek, getPreviousWeek } from './utils'
import type { PlannerProps } from './types'

export function Planner({ 
  onCreateLesson
}: Pick<PlannerProps, 'onCreateLesson'>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week')
  
  const handlePreviousDate = () => {
    setCurrentDate(getPreviousWeek(currentDate))
  }
  
  const handleNextDate = () => {
    setCurrentDate(getNextWeek(currentDate))
  }
  
  const handleToday = () => {
    setCurrentDate(new Date())
  }
  
  const handleCreateLesson = () => {
    onCreateLesson?.(new Date())
  }
  
  const handleViewModeChange = (mode: 'week' | 'month' | 'year') => {
    setViewMode(mode)
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Панель управления */}
      <PlannerHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onPreviousDate={handlePreviousDate}
        onNextDate={handleNextDate}
        onToday={handleToday}
        onCreateLesson={handleCreateLesson}
      />
      
      {/* Временная заглушка для содержимого */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">Планер в разработке</div>
          <div className="text-sm">
            Текущий режим: <span className="font-medium text-blue-600">{viewMode === 'week' ? 'Неделя' : viewMode === 'month' ? 'Месяц' : 'Год'}</span>
          </div>
          <div className="text-sm mt-2 text-blue-600">
            Используйте кнопку &ldquo;Режим&rdquo; для переключения между видами
          </div>
        </div>
      </div>
    </div>
  )
}
