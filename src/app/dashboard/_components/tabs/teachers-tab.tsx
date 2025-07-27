import { PageHeader, PlaceholderCard } from '../common'

export function TeachersTab() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader 
        title="Мои преподаватели"
        description="Связь с преподавателями и расписание занятий."
      />
      <div className="flex-1">
        <PlaceholderCard 
          title="Список преподавателей" 
          description="Функционал в разработке..."
        />
      </div>
    </div>
  )
}
