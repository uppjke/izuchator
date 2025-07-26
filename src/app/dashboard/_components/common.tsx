interface PlaceholderCardProps {
  title: string
  description: string
}

export function PlaceholderCard({ title, description }: PlaceholderCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-zinc-200/50 text-center">
      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-zinc-500">{description}</p>
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
