import { Calendar } from '@/components/calendar'
import type { Lesson } from '@/components/calendar'

// Тестовые данные для демонстрации
const mockLessons: Lesson[] = [
  {
    id: '1',
    title: 'Математика с Анной',
    description: 'Алгебра, уравнения',
    start_time: new Date(2025, 6, 28, 10, 0).toISOString(), // 28 июля 2025, 10:00
    duration_minutes: 60,
    owner_id: 'teacher-1',
    student_id: 'student-1',
    reminder_minutes: 30,
    status: 'scheduled',
    is_series_master: false
  },
  {
    id: '2',
    title: 'Физика с Петром',
    description: 'Механика',
    start_time: new Date(2025, 6, 29, 14, 0).toISOString(), // 29 июля 2025, 14:00
    duration_minutes: 90,
    owner_id: 'teacher-2',
    student_id: 'student-2',
    reminder_minutes: 30,
    status: 'scheduled',
    is_series_master: false
  }
]

export function PlannerTab() {
  const handleCreateLesson = (date: Date, hour: number) => {
    console.log('Создать урок:', date, hour)
    // TODO: Открыть диалог создания урока
  }

  const handleEditLesson = (lesson: Lesson) => {
    console.log('Редактировать урок:', lesson)
    // TODO: Открыть диалог редактирования урока
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Планировщик</h1>
        <p className="text-gray-600">Управляйте расписанием уроков</p>
      </div>
      
      <Calendar
        lessons={mockLessons}
        view="week"
        onCreateLesson={handleCreateLesson}
        onEditLesson={handleEditLesson}
      />
    </div>
  )
}
