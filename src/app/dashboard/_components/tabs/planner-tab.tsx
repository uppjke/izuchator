// TODO: Импортировать новый календарь
// import { Calendar } from '@/components/calendar'
// import type { Lesson } from '@/components/calendar'

export function PlannerTab() {
  const handleCreateLesson = (date: Date, hour: number) => {
    console.log('Создать урок:', date, hour)
    // TODO: Открыть диалог создания урока
  }

  const handleEditLesson = (lesson: any) => {
    console.log('Редактировать урок:', lesson)
    // TODO: Открыть диалог редактирования урока
  }

  return (
    <div>
      {/* TODO: Добавить новый календарь */}
      <div className="p-8 text-center text-gray-500">
        Календарь будет добавлен здесь
      </div>
    </div>
  )
}
