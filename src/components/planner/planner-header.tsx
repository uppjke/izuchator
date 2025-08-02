'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface PlannerHeaderProps {
  currentDate: Date
  onPreviousDate: () => void
  onNextDate: () => void
  onToday: () => void
  onCreateLesson: () => void
}

export function PlannerHeader({
  currentDate,
  onPreviousDate,
  onNextDate,
  onToday,
  onCreateLesson
}: PlannerHeaderProps) {
  // Форматируем дату с заглавной буквы
  const monthYear = format(currentDate, 'LLLL yyyy', { locale: ru })
  const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1)

  return (
    <div className="sticky top-0 z-10 bg-white">
      {/* Основная панель управления */}
      <div className="flex items-center justify-between p-4">
        {/* Левая часть - навигация по датам */}
        <div className="flex items-center gap-2">
          {/* Кнопка назад */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPreviousDate}
            className="p-2"
          >
            <Icon icon={ChevronLeft} size="sm" />
          </Button>
          
          {/* Кнопка "Сегодня" */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToday}
          >
            Сегодня
          </Button>
          
          {/* Кнопка вперед */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onNextDate}
            className="p-2"
          >
            <Icon icon={ChevronRight} size="sm" />
          </Button>
        </div>

        {/* Центральная часть - месяц и год (только на широких экранах - недельный режим) */}
        <div className="hidden lg:flex flex-1 justify-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {capitalizedMonthYear}
          </h2>
        </div>

        {/* Правая часть - кнопка добавления */}
        <Button 
          onClick={onCreateLesson}
          className="flex items-center gap-2"
        >
          <Icon icon={Plus} size="sm" />
          <span className="hidden sm:inline">Добавить</span>
        </Button>
      </div>

      {/* Дополнительная строка для узких экранов (режим агенды) */}
      <div className="flex justify-center px-4 pb-4 lg:hidden">
        <h2 className="text-lg font-semibold text-gray-900">
          {capitalizedMonthYear}
        </h2>
      </div>
    </div>
  )
}
