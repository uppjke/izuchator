'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from './_components/sidebar'
import { DashboardHeader } from './_components/header'
import Dashboard from './page'

export default function DashboardLayout() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  // iOS Safari viewport height fix
  useEffect(() => {
    function setVH() {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    // Set initial value
    setVH()

    // Update on resize and orientation change
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', () => {
      // Delay to ensure the viewport has updated
      setTimeout(setVH, 100)
    })

    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  // Показываем загрузку пока проверяем авторизацию
  if (loading) {
    return (
      <div className="flex dashboard-container items-center justify-center bg-gray-50">
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

  const userRole = (user?.role as 'student' | 'teacher') || 'student'

  return (
    <div className="flex dashboard-container bg-zinc-50/50">
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
        <main className="flex-1 overflow-hidden p-4 lg:p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-zinc-200/50 h-full overflow-auto">
            <div className="p-4 lg:p-6 h-full">
              <Dashboard activeTab={activeTab} userRole={userRole} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
