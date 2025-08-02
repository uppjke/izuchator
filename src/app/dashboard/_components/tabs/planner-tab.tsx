import { Planner } from '@/components/planner'

export function PlannerTab() {
  const handleCreateLesson = (date: Date) => {
    console.log('Создать урок:', date)
    // TODO: Открыть диалог создания урока
  }

  return (
    <div className="h-full">
      <Planner
        onCreateLesson={handleCreateLesson}
      />
    </div>
  )
}
