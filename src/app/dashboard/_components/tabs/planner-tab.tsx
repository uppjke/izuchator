import { Planner } from '@/components/planner'
import type { Lesson } from '@/components/planner'

export function PlannerTab() {
  const handleCreateLesson = (date: Date) => {
    console.log('Создать урок:', date)
    // TODO: Открыть диалог создания урока
  }

  const handleEditLesson = (lesson: Lesson) => {
    console.log('Редактировать урок:', lesson)
    // TODO: Открыть диалог редактирования урока
  }

  return (
    <div className="h-full">
      <Planner
        onCreateLesson={handleCreateLesson}
        onEditLesson={handleEditLesson}
      />
    </div>
  )
}
