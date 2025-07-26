import { PageHeader, PlaceholderCard } from '../_components/common'

export default function MaterialsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Мои материалы"
        description="Управление учебными материалами, файлами и документами."
      />
      <PlaceholderCard 
        title="Файловый менеджер" 
        description="Файловый менеджер в разработке..."
      />
    </div>
  )
}
