// Константы стилей
const CARD_BASE_CLASSES = "bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-zinc-200/50 hover:shadow-md transition-all duration-200"

interface PlaceholderCardProps {
  title: string
  description: string
  className?: string
}

export function PlaceholderCard({ title, description, className = "" }: PlaceholderCardProps) {
  return (
    <div className={`${CARD_BASE_CLASSES} text-center ${className}`}>
      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-zinc-600">{description}</p>
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">{title}</h1>
      <p className="text-zinc-600">{description}</p>
    </div>
  )
}

// Общий компонент для placeholder табов
interface PlaceholderTabProps {
  title: string
  description: string
  cardTitle: string
  cardDescription?: string
}

export function PlaceholderTab({ 
  title, 
  description, 
  cardTitle, 
  cardDescription = "Функционал в разработке..." 
}: PlaceholderTabProps) {
  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader title={title} description={description} />
      <div className="flex-1">
        <PlaceholderCard title={cardTitle} description={cardDescription} />
      </div>
    </div>
  )
}
