import { PageHeader, PlaceholderCard } from '../common'

export function PlannerTab() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Планер"
        description="Здесь будет календарь с планированием занятий."
      />
      <PlaceholderCard 
        title="Календарь" 
        description="Календарь в разработке..."
      />
    </div>
  )
}
