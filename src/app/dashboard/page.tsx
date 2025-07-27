import { useMemo } from 'react'
import { DashboardTab } from './_components/tabs/dashboard-tab'
import { PlannerTab } from './_components/tabs/planner-tab'
import { StudentsTab } from './_components/tabs/students-tab'
import { TeachersTab } from './_components/tabs/teachers-tab'
import { MaterialsTab } from './_components/tabs/materials-tab'

interface DashboardProps {
  activeTab: string
  userRole: 'student' | 'teacher'
}

const tabComponents = {
  dashboard: DashboardTab,
  planner: PlannerTab,
  students: StudentsTab,
  teachers: TeachersTab,
  materials: MaterialsTab,
} as const

export default function Dashboard({ activeTab, userRole }: DashboardProps) {
  const ActiveComponent = useMemo(() => {
    // Валидация доступа к табам по роли
    if ((activeTab === 'students' && userRole !== 'teacher') ||
        (activeTab === 'teachers' && userRole !== 'student')) {
      return tabComponents.dashboard
    }
    
    return tabComponents[activeTab as keyof typeof tabComponents] || tabComponents.dashboard
  }, [activeTab, userRole])

  return (
    <div className="h-full">
      <ActiveComponent />
    </div>
  )
}
