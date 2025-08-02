'use client'

import React, { useState } from 'react'
import { PlannerHeader } from './planner-header'
import { WeekGrid } from './week-grid'
import { getNextWeek, getPreviousWeek, getWeekData } from './utils'
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
  
  const handleCreateLesson = (date: Date, hour?: number) => {
    const lessonDate = hour ? new Date(date.setHours(hour, 0, 0, 0)) : date
    onCreateLesson?.(lessonDate)
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
        onCreateLesson={() => handleCreateLesson(new Date())}
      />
      
      {/* Содержимое планера */}
      <div className="flex-1 min-h-0">
        {viewMode === 'week' && (
          <WeekGrid
            week={getWeekData(currentDate)}
          />
        )}
        
        {viewMode !== 'week' && (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">Режим в разработке</div>
              <div className="text-sm">
                Текущий режим: <span className="font-medium text-blue-600">
                  {viewMode === 'month' ? 'Месяц' : 'Год'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
