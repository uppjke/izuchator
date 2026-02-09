import { Planner } from '@/components/planner'

interface PlannerTabProps {
  searchQuery?: string
}

export function PlannerTab({ searchQuery = '' }: PlannerTabProps) {
  const handleCreateLesson = (date: Date) => {
    console.log('Создать урок:', date)
    // TODO: Открыть диалог создания урока
  }

  return (
    <div className="h-full">
      <Planner
        onCreateLesson={handleCreateLesson}
        searchQuery={searchQuery}
      />
    </div>
  )
}
