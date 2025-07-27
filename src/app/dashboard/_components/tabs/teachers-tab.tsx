import { PageHeader, PlaceholderCard } from '../common'

export function TeachersTab() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Мои преподаватели"
        description="Ваши преподаватели и расписание занятий."
      />
      <PlaceholderCard 
        title="Список преподавателей" 
        description="Функционал в разработке..."
      />
    </div>
  )
}
