import { PageHeader, PlaceholderCard } from '../_components/common'

export default function TeachersPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Мои преподаватели"
        description="Список ваших преподавателей и расписание занятий."
      />
      <PlaceholderCard 
        title="Список преподавателей" 
        description="Список преподавателей в разработке..."
      />
    </div>
  )
}
