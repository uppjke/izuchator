import { PageHeader, PlaceholderCard } from '../common'

export function MaterialsTab() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader 
        title="Мои материалы"
        description="Учебные материалы, файлы и документы."
      />
      <div className="flex-1">
        <PlaceholderCard 
          title="Библиотека материалов" 
          description="Функционал в разработке..."
        />
      </div>
    </div>
  )
}
