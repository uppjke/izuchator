import { Calendar } from '@/components/calendar'
import type { Lesson } from '@/components/calendar'

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
    <div>
      <Calendar
        onCreateLesson={handleCreateLesson}
        onEditLesson={handleEditLesson}
      />
    </div>
  )
}
