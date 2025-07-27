'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from './_components/sidebar'
import { DashboardHeader } from './_components/header'
import Dashboard from './page'

type TabType = 'dashboard' | 'planner' | 'students' | 'teachers' | 'materials'
type UserRole = 'student' | 'teacher'

// Константы стилей
const CONTAINER_CLASSES = "bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-zinc-200/50 h-full overflow-auto"
const MAIN_PADDING = "p-4 lg:p-6"

export default function DashboardLayout() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const userRole = (user?.role as UserRole) || 'student'
  
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const changeTab = useCallback((newTab: TabType) => {
    // Валидация доступа к табам по роли
    if ((newTab === 'students' && userRole !== 'teacher') || 
        (newTab === 'teachers' && userRole !== 'student')) return
    
    setActiveTab(newTab)
    setSidebarOpen(false) // Закрываем мобильное меню при смене таба
  }, [userRole])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

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

  // Early returns для состояний загрузки и авторизации
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

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex dashboard-container bg-zinc-50/50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        userRole={userRole}
        user={user}
        activeTab={activeTab}
        onTabChange={changeTab}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <DashboardHeader 
          onMenuClick={toggleSidebar} 
          activeTab={activeTab}
        />

        {/* Page content */}
        <main className={`flex-1 overflow-hidden ${MAIN_PADDING}`}>
          <div className={CONTAINER_CLASSES}>
            <div className={`${MAIN_PADDING} h-full`}>
              <Dashboard activeTab={activeTab} userRole={userRole} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
