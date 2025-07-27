import { PageHeader, PlaceholderCard } from '../common'

export function PlannerTab() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader 
        title="Планер"
        description="Здесь будет календарь с планированием занятий."
      />
      <div className="flex-1">
        <PlaceholderCard 
          title="Календарь" 
          description="Календарь в разработке..."
        />
      </div>
    </div>
  )
}
