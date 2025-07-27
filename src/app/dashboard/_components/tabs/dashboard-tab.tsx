import { PageHeader, PlaceholderCard } from '../common'

export function DashboardTab() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader 
        title="Добро пожаловать в дашборд!"
        description="Здесь будет основная информация о вашем обучении."
      />

      {/* Dashboard cards */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
        <PlaceholderCard 
          title="Статистика"
          description="Здесь будут графики и метрики"
        />
        <PlaceholderCard 
          title="Последние занятия"
          description="История недавних уроков"
        />
        <PlaceholderCard 
          title="Быстрые действия"
          description="Часто используемые функции"
        />
      </div>
    </div>
  )
}
