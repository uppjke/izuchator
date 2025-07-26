import { PageHeader } from './_components/common'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Добро пожаловать в дашборд!"
        description="Здесь будет основная информация о вашем обучении."
      />

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard 
          title="Статистика"
          description="Здесь будут графики и метрики"
        />
        <DashboardCard 
          title="Последние занятия"
          description="История недавних уроков"
        />
        <DashboardCard 
          title="Быстрые действия"
          description="Часто используемые функции"
        />
      </div>
    </div>
  )
}

function DashboardCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-zinc-200/50 hover:shadow-md transition-all duration-200">
      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-zinc-600">{description}</p>
    </div>
  )
}
