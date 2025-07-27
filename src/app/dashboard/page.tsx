import { PageHeader } from './_components/common'
import { DashboardTab } from './_components/tabs/dashboard-tab'
import { PlannerTab } from './_components/tabs/planner-tab'
import { StudentsTab } from './_components/tabs/students-tab'
import { TeachersTab } from './_components/tabs/teachers-tab'
import { MaterialsTab } from './_components/tabs/materials-tab'

interface DashboardProps {
  activeTab: string
  userRole: 'student' | 'teacher'
}

export default function Dashboard({ activeTab, userRole }: DashboardProps) {
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />
      case 'planner':
        return <PlannerTab />
      case 'students':
        return userRole === 'teacher' ? <StudentsTab /> : <DashboardTab />
      case 'teachers':
        return userRole === 'student' ? <TeachersTab /> : <DashboardTab />
      case 'materials':
        return <MaterialsTab />
      default:
        return <DashboardTab />
    }
  }

  return (
    <div className="h-full">
      {renderActiveTab()}
    </div>
  )
}
