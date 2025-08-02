'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface PlannerHeaderProps {
  currentDate: Date
  viewMode: 'week' | 'month' | 'year'
  onViewModeChange: (mode: 'week' | 'month' | 'year') => void
  onPreviousDate: () => void
  onNextDate: () => void
  onToday: () => void
  onCreateLesson: () => void
}

export function PlannerHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPreviousDate,
  onNextDate,
  onToday,
  onCreateLesson
}: PlannerHeaderProps) {
  // Форматируем дату с заглавной буквы
  const monthYear = format(currentDate, 'LLLL yyyy', { locale: ru })
  const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1)

  // Получаем текст для текущего режима
  const getModeText = (mode: 'week' | 'month' | 'year') => {
    switch (mode) {
      case 'week': return 'Неделя'
      case 'month': return 'Месяц'
      case 'year': return 'Год'
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-white">
      {/* Верхний уровень - переключатель режима и кнопка добавления */}
      <div className="flex items-center justify-between p-4">
        {/* Левая часть - переключатель режима */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Циклический переключатель режимов
              const modes: ('week' | 'month' | 'year')[] = ['week', 'month', 'year']
              const currentIndex = modes.indexOf(viewMode)
              const nextIndex = (currentIndex + 1) % modes.length
              onViewModeChange(modes[nextIndex])
            }}
            className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            {getModeText(viewMode)}
          </Button>
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

      {/* Нижний уровень - навигация по датам */}
      <div className="px-4 pb-2">
        {/* Навигация по датам слева */}
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
      </div>

      {/* Месяц и год по центру */}
      <div className="flex justify-center px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {capitalizedMonthYear}
        </h2>
      </div>
    </div>
  )
}
