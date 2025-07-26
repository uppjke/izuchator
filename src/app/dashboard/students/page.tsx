import { PageHeader, PlaceholderCard } from '../_components/common'

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Мои ученики"
        description="Управление учениками и отслеживание их прогресса."
      />
      <PlaceholderCard 
        title="Список учеников" 
        description="Список учеников в разработке..."
      />
    </div>
  )
}
