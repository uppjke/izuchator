import { PageHeader, PlaceholderCard } from '../common'

export function StudentsTab() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Мои ученики"
        description="Управление учениками и отслеживание их прогресса."
      />
      <PlaceholderCard 
        title="Список учеников" 
        description="Функционал в разработке..."
      />
    </div>
  )
}
