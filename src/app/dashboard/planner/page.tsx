import { PageHeader, PlaceholderCard } from '../_components/common'

export default function PlannerPage() {
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
