'use client'

import React, { useState, useEffect } from 'react'
import { PlannerHeader } from './planner-header'
import { WeekGrid } from './week-grid'
import { AgendaView } from './agenda-view'
import { getNextWeek, getPreviousWeek, getWeekData } from './utils'
import { LessonDialog } from './lesson-dialog'
import type { PlannerProps, Lesson } from './types'

export function Planner({ 
  onCreateLesson
}: Pick<PlannerProps, 'onCreateLesson'>) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week')
  const [isWideScreen, setIsWideScreen] = useState(true)
  const [forceTodayInAgenda, setForceTodayInAgenda] = useState(false)
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false)
  const [newLessonDate, setNewLessonDate] = useState<Date | null>(null)
  
  // Тестовые данные уроков - все возможные варианты
  const testLessons: Lesson[] = [
    // Сегодня - 4 урока
    {
      id: '1',
      title: 'Математика',
      description: 'Изучение квадратных уравнений',
      start_time: new Date(2025, 7, 7, 9, 0).toISOString(), // Сегодня 9:00
      duration_minutes: 60,
      student_id: 'student1',
      owner_id: 'teacher1',
      status: 'scheduled',
      price: 1500,
      reminder_minutes: 15,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '2',
      title: 'Физика',
      description: 'Законы Ньютона',
      start_time: new Date(2025, 7, 7, 11, 30).toISOString(), // Сегодня 11:30
      duration_minutes: 90,
      student_id: 'student2',
      owner_id: 'teacher1',
      status: 'completed',
      price: 2000,
      reminder_minutes: 30,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '3',
      title: 'Химия',
      description: 'Органические соединения',
      start_time: new Date(2025, 7, 7, 14, 0).toISOString(), // Сегодня 14:00
      duration_minutes: 75,
      student_id: 'student3',
      owner_id: 'teacher1',
      status: 'cancelled',
      price: null,
      reminder_minutes: 20,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '4',
      title: 'История',
      description: 'Великая Отечественная война',
      start_time: new Date(2025, 7, 7, 16, 30).toISOString(), // Сегодня 16:30
      duration_minutes: 60,
      student_id: 'student4',
      owner_id: 'teacher1',
      status: 'confirmed',
      price: 1800,
      reminder_minutes: 15,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    
    // Завтра - 5 уроков
    {
      id: '5',
      title: 'Английский язык',
      description: 'Present Perfect',
      start_time: new Date(2025, 7, 8, 8, 30).toISOString(), // Завтра 8:30
      duration_minutes: 45,
      student_id: 'student5',
      owner_id: 'teacher1',
      status: 'in_progress',
      price: 1200,
      reminder_minutes: 10,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '6',
      title: 'Биология',
      description: 'Клеточное строение',
      start_time: new Date(2025, 7, 8, 10, 15).toISOString(), // Завтра 10:15
      duration_minutes: 60,
      student_id: 'student6',
      owner_id: 'teacher1',
      status: 'scheduled',
      price: null,
      reminder_minutes: 15,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '7',
      title: 'Информатика',
      description: 'Алгоритмы и структуры данных',
      start_time: new Date(2025, 7, 8, 12, 0).toISOString(), // Завтра 12:00
      duration_minutes: 90,
      student_id: 'student7',
      owner_id: 'teacher1',
      status: 'completed',
      price: null,
      reminder_minutes: 20,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '8',
      title: 'География',
      description: 'Климатические зоны',
      start_time: new Date(2025, 7, 8, 15, 30).toISOString(), // Завтра 15:30
      duration_minutes: 45,
      student_id: 'student8',
      owner_id: 'teacher1',
      status: 'cancelled',
      price: 1000,
      reminder_minutes: 10,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '9',
      title: 'Литература',
      description: 'Анализ произведений',
      start_time: new Date(2025, 7, 8, 17, 45).toISOString(), // Завтра 17:45
      duration_minutes: 60,
      student_id: 'student9',
      owner_id: 'teacher1',
      status: 'confirmed',
      price: null,
      reminder_minutes: 15,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    
    // Послезавтра - 3 урока
    {
      id: '10',
      title: 'Русский язык',
      description: 'Синтаксис и пунктуация',
      start_time: new Date(2025, 7, 9, 10, 0).toISOString(), // Послезавтра 10:00
      duration_minutes: 60,
      student_id: 'student10',
      owner_id: 'teacher1',
      status: 'in_progress',
      price: null,
      reminder_minutes: 15,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '11',
      title: 'Обществознание',
      description: 'Политическая система',
      start_time: new Date(2025, 7, 9, 14, 30).toISOString(), // Послезавтра 14:30
      duration_minutes: 75,
      student_id: 'student1', // Повторяющийся студент
      owner_id: 'teacher1',
      status: 'scheduled',
      price: 1600,
      reminder_minutes: 20,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    },
    {
      id: '12',
      title: 'Экономика',
      description: 'Микроэкономика',
      start_time: new Date(2025, 7, 9, 16, 15).toISOString(), // Послезавтра 16:15
      duration_minutes: 90,
      student_id: 'student2', // Повторяющийся студент
      owner_id: 'teacher1',
      status: 'completed',
      price: 2200,
      reminder_minutes: 25,
      is_series_master: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent_series_id: null,
      recurrence_rule: null,
      room_id: null
    }
  ]
  
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
      />
      
      {/* Содержимое планера */}
      <div className="flex-1 min-h-0">
        {viewMode === 'week' && isWideScreen && (
          <WeekGrid
            week={getWeekData(currentDate)}
            lessons={testLessons}
            onEditLesson={(lesson) => console.log('Редактировать урок:', lesson)}
          />
        )}
        
        {viewMode === 'week' && !isWideScreen && (
          <AgendaView
            week={getWeekData(currentDate)}
            lessons={testLessons}
            onCreateLesson={(date) => handleCreateLesson(date)}
            onEditLesson={(lesson) => console.log('Редактировать урок:', lesson)}
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
