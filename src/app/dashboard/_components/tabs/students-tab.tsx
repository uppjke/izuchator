import { PageHeader, PlaceholderCard } from '../common'

export function StudentsTab() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader 
        title="Мои ученики"
        description="Управление учениками и их прогрессом."
      />
      <div className="flex-1">
        <PlaceholderCard 
          title="Список учеников" 
          description="Функционал в разработке..."
        />
      </div>
    </div>
  )
}
