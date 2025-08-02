'use client'

import React, { useState, useEffect } from 'react'
import { PlannerHeader } from './planner-header'
import { WeekGrid } from './week-grid'
import { AgendaView } from './agenda-view'
import { getNextWeek, getPreviousWeek, getWeekData } from './utils'
import type { PlannerProps } from './types'

export function Planner({ 
  onCreateLesson
}: Pick<PlannerProps, 'onCreateLesson'>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week')
  const [isWideScreen, setIsWideScreen] = useState(true)
  
  // Проверка ширины экрана
  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 1024) // lg breakpoint
    }
    
    checkScreenWidth()
    window.addEventListener('resize', checkScreenWidth)
    
    return () => window.removeEventListener('resize', checkScreenWidth)
  }, [])
  
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
        isWideScreen={isWideScreen}
      />
      
      {/* Содержимое планера */}
      <div className="flex-1 min-h-0">
        {viewMode === 'week' && isWideScreen && (
          <WeekGrid
            week={getWeekData(currentDate)}
          />
        )}
        
        {viewMode === 'week' && !isWideScreen && (
          <AgendaView
            week={getWeekData(currentDate)}
            lessons={[]} // TODO: Добавить реальные данные уроков
            onCreateLesson={(date) => handleCreateLesson(date)}
            onEditLesson={(lesson) => console.log('Редактировать урок:', lesson)}
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
