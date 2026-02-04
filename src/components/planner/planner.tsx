'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { PlannerHeader } from './planner-header'
import { WeekGrid } from './week-grid'
import { AgendaView } from './agenda-view'
import { MonthView } from './month-view'
import { YearView } from './year-view'
import { getNextWeek, getPreviousWeek, getWeekData } from './utils'
import { LessonDialog } from './lesson-dialog'
import { LessonDetailsDialog } from './lesson-details-dialog'
import type { PlannerProps, Lesson } from './types'
import { useQuery } from '@tanstack/react-query'
import { getLessonsForPeriod } from '@/lib/api'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, addYears, subMonths, subYears } from 'date-fns'
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
  
  // Расчет периода для загрузки уроков в зависимости от режима
  const { periodStart, periodEnd } = useMemo(() => {
    switch (viewMode) {
      case 'week':
        return {
          periodStart: startOfWeek(currentDate, { weekStartsOn: 1 }),
          periodEnd: endOfWeek(currentDate, { weekStartsOn: 1 })
        }
      case 'month':
        return {
          periodStart: startOfMonth(currentDate),
          periodEnd: endOfMonth(currentDate)
        }
      case 'year':
        return {
          periodStart: startOfYear(currentDate),
          periodEnd: endOfYear(currentDate)
        }
    }
  }, [currentDate, viewMode])

  const { data: lessons = [], refetch: refetchLessons } = useQuery<Lesson[]>({
    queryKey: ['lessons', viewMode, periodStart.toISOString()],
    queryFn: () => getLessonsForPeriod(periodStart, new Date(periodEnd.getTime() + 1000)),
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
    switch (viewMode) {
      case 'week':
        setCurrentDate(getPreviousWeek(currentDate))
        break
      case 'month':
        setCurrentDate(subMonths(currentDate, 1))
        break
      case 'year':
        setCurrentDate(subYears(currentDate, 1))
        break
    }
  }
  
  const handleNextDate = () => {
    switch (viewMode) {
      case 'week':
        setCurrentDate(getNextWeek(currentDate))
        break
      case 'month':
        setCurrentDate(addMonths(currentDate, 1))
        break
      case 'year':
        setCurrentDate(addYears(currentDate, 1))
        break
    }
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
        selectedDate={newLessonDate}
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
        onDeleted={() => {
          refetchLessons()
          queryClient.invalidateQueries({ queryKey: ['lessons'] })
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
        
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            lessons={lessons}
            onDayClick={(date) => {
              setCurrentDate(date)
              setViewMode('week')
            }}
            onLessonClick={handleShowLessonDetails}
          />
        )}
        
        {viewMode === 'year' && (
          <YearView
            currentDate={currentDate}
            lessons={lessons}
            onMonthClick={(date) => {
              setCurrentDate(date)
              setViewMode('month')
            }}
          />
        )}
      </div>
    </div>
  )
}
