'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { PlannerHeader } from './planner-header'
import { WeekGrid } from './week-grid'
import { AgendaView } from './agenda-view'
import { getNextWeek, getPreviousWeek, getWeekData } from './utils'
import { LessonDialog } from './lesson-dialog'
import { LessonDetailsDialog } from './lesson-details-dialog'
import type { PlannerProps, Lesson } from './types'
import { useQuery } from '@tanstack/react-query'
import { getLessonsForPeriod } from '@/lib/api'
import { startOfWeek, endOfWeek } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'

export function Planner({ 
  onCreateLesson
}: Pick<PlannerProps, 'onCreateLesson'>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week')
  const [isWideScreen, setIsWideScreen] = useState(true)
  const [forceTodayInAgenda, setForceTodayInAgenda] = useState(false)
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false)
  const [newLessonDate, setNewLessonDate] = useState<Date | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const queryClient = useQueryClient()
  
  // Расчет текущей недели и загрузка уроков
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])

  const { data: lessons = [], refetch: refetchLessons } = useQuery<Lesson[]>({
    queryKey: ['lessons', weekStart.toISOString()],
    queryFn: () => getLessonsForPeriod(weekStart, new Date(weekEnd.getTime() + 1000)),
  })
  
  // Проверка ширины экрана
  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 1024) // lg breakpoint
    }
    
    checkScreenWidth()
    window.addEventListener('resize', checkScreenWidth)
    
    return () => window.removeEventListener('resize', checkScreenWidth)
  }, [])
  
  // Сбрасываем флаг forceToday после его использования
  useEffect(() => {
    if (forceTodayInAgenda) {
      setForceTodayInAgenda(false)
    }
  }, [forceTodayInAgenda])
  
  const handlePreviousDate = () => {
    setCurrentDate(getPreviousWeek(currentDate))
  }
  
  const handleNextDate = () => {
    setCurrentDate(getNextWeek(currentDate))
  }
  
  const handleToday = () => {
    setCurrentDate(new Date())
    setForceTodayInAgenda(true)
  }
  
  const handleCreateLesson = (date: Date, hour?: number) => {
    const baseDate = new Date(date)
    const lessonDate = hour !== undefined ? new Date(baseDate.setHours(hour, 0, 0, 0)) : baseDate
    setNewLessonDate(lessonDate)
    setIsLessonDialogOpen(true)
    onCreateLesson?.(lessonDate)
  }
  
  const handleViewModeChange = (mode: 'week' | 'month' | 'year') => {
    setViewMode(mode)
  }

  const handleShowLessonDetails = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setIsDetailsOpen(true)
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
      <LessonDialog 
        open={isLessonDialogOpen} 
        onOpenChange={setIsLessonDialogOpen} 
        date={newLessonDate}
        onCreated={() => {
          refetchLessons()
          queryClient.invalidateQueries({ queryKey: ['lessons'] })
        }}
      />
      <LessonDetailsDialog
        lesson={selectedLesson}
        open={isDetailsOpen}
        onOpenChange={(o) => {
          setIsDetailsOpen(o)
          if (!o) setSelectedLesson(null)
        }}
      />
      
      {/* Содержимое планера */}
      <div className="flex-1 min-h-0">
    {viewMode === 'week' && isWideScreen && (
          <WeekGrid
            week={getWeekData(currentDate)}
      lessons={lessons}
            onEditLesson={handleShowLessonDetails}
          />
        )}
        
    {viewMode === 'week' && !isWideScreen && (
          <AgendaView
            week={getWeekData(currentDate)}
      lessons={lessons}
            onCreateLesson={(date) => handleCreateLesson(date)}
            onEditLesson={handleShowLessonDetails}
            forceToday={forceTodayInAgenda}
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
