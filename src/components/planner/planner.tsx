'use client'

import React from 'react'
import { PlannerHeader } from './planner-header'
import type { PlannerProps } from './types'

export function Planner({ 
  onCreateLesson
}: Pick<PlannerProps, 'onCreateLesson'>) {
  const handleCreateLesson = () => {
    onCreateLesson?.(new Date())
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Панель управления */}
      <PlannerHeader
        onCreateLesson={handleCreateLesson}
      />
      
      {/* Временная заглушка для содержимого */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">Планер в разработке</div>
          <div className="text-sm">
            Здесь будет отображаться календарь и список уроков
          </div>
        </div>
      </div>
    </div>
  )
}
