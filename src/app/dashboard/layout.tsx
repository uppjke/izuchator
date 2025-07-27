'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from './_components/sidebar'
import { DashboardHeader } from './_components/header'
import Dashboard from './page'

interface DashboardLayoutProps {
  // Больше не нужен children
}

export default function DashboardLayout({}: DashboardLayoutProps) {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  // Показываем загрузку пока проверяем авторизацию
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Если не авторизован, ничего не показываем (идет редирект)
  if (!isAuthenticated) {
    return null
  }

  // TODO: Получать роль из user.role вместо hardcode
  const userRole = (user?.role as 'student' | 'teacher') || 'student'

  return (
    <div className="flex h-screen bg-zinc-50/50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            <Dashboard activeTab={activeTab} userRole={userRole} />
          </div>
        </main>
      </div>
    </div>
  )
}
