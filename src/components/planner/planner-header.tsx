'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface PlannerHeaderProps {
  currentDate: Date
  onPreviousWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onCreateLesson: () => void
}

export function PlannerHeader({
  currentDate,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onCreateLesson
}: PlannerHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      {/* Левая часть - навигация по времени */}
      <div className="flex items-center gap-4">
        {/* Кнопки навигации */}
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPreviousWeek}
            className="p-2"
          >
            <Icon icon={ChevronLeft} size="sm" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onNextWeek}
            className="p-2"
          >
            <Icon icon={ChevronRight} size="sm" />
          </Button>
        </div>

        {/* Текущий период */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </h2>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToday}
            className="hidden sm:flex"
          >
            Сегодня
          </Button>
        </div>
      </div>

      {/* Правая часть - действия */}
      <div className="flex items-center gap-2">
        {/* Кнопка добавления - адаптивная */}
        <Button 
          onClick={onCreateLesson}
          className="flex items-center gap-2"
        >
          <Icon icon={Plus} size="sm" />
          {/* На мобильных показываем только иконку */}
          <span className="hidden sm:inline">Добавить</span>
        </Button>
      </div>
    </div>
  )
}
