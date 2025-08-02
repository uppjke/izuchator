'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlannerHeader } from './planner-header'
import { getNextWeek, getPreviousWeek } from './utils'
import type { PlannerProps } from './types'

export function Planner({ 
  onCreateLesson
}: Pick<PlannerProps, 'onCreateLesson'>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
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
  
  return (
    <div className="h-full flex flex-col">
      {/* Панель управления */}
      <PlannerHeader
        currentDate={currentDate}
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
            Здесь будет отображаться календарь и список уроков
          </div>
          <div className="text-sm mt-2 text-blue-600">
            На широких экранах (≥1024px) - недельная сетка с датой по центру<br/>
            На узких экранах (&lt;1024px) - агенда с датой под панелью
          </div>
        </div>
      </div>
    </div>
  )
}
