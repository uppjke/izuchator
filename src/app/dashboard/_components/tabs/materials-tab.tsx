import { PageHeader, PlaceholderCard } from '../common'

export function MaterialsTab() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Мои материалы"
        description="Учебные материалы, файлы и документы."
      />
      <PlaceholderCard 
        title="Библиотека материалов" 
        description="Функционал в разработке..."
      />
    </div>
  )
}
