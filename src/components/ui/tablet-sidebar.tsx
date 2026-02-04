'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FolderOpen,
  Home,
  Settings,
  LogOut,
  X,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'

export type TabId = 'dashboard' | 'planner' | 'students' | 'teachers' | 'materials'

interface TabItem {
  id: TabId
  title: string
  icon: LucideIcon
  role?: 'student' | 'teacher'
}

const navigationItems: TabItem[] = [
  {
    id: 'dashboard',
    title: 'Дашборд',
    icon: LayoutDashboard,
  },
  {
    id: 'planner',
    title: 'Планер',
    icon: Calendar,
  },
  {
    id: 'students',
    title: 'Мои ученики',
    icon: Users,
    role: 'teacher'
  },
  {
    id: 'teachers',
    title: 'Мои преподаватели',
    icon: Users,
    role: 'student'
  },
  {
    id: 'materials',
    title: 'Мои материалы',
    icon: FolderOpen,
  },
]

// Анимации для сайдбара
const sidebarVariants = {
  closed: {
    x: '-100%',
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 40
    }
  },
  open: {
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 40
    }
  }
}

const overlayVariants = {
  closed: {
    opacity: 0,
    transition: { duration: 0.2 }
  },
  open: {
    opacity: 1,
    transition: { duration: 0.2 }
  }
}

interface TabletSidebarProps {
  isOpen: boolean
  onClose: () => void
  userRole: 'student' | 'teacher'
  user?: {
    email: string
    name: string
    role: string
  } | null
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onLogout?: () => void
}

export function TabletSidebar({
  isOpen,
  onClose,
  userRole,
  user,
  activeTab,
  onTabChange,
  onLogout,
}: TabletSidebarProps) {
  const filteredItems = navigationItems.filter(item => !item.role || item.role === userRole)

  const handleTabClick = useCallback((tabId: TabId) => {
    onTabChange(tabId)
    onClose()
  }, [onTabChange, onClose])

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Блокировка скролла body при открытом сайдбаре
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.aside
            key="sidebar"
            className="fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col"
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="Изучатор"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="text-lg font-semibold">Изучатор</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 rounded-full hover:bg-zinc-100"
              >
                <Icon icon={X} size="md" />
                <span className="sr-only">Закрыть</span>
              </Button>
            </div>

            {/* User profile card */}
            <div className="p-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <UserAvatar 
                  user={{
                    name: user?.name,
                    email: user?.email,
                    avatar_url: null
                  }}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-zinc-900 truncate">
                    {user?.name || 'Пользователь'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {user?.email || 'email@example.com'}
                  </p>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                    userRole === 'teacher' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  )}>
                    {userRole === 'teacher' ? 'Преподаватель' : 'Ученик'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {filteredItems.map((item) => {
                const isActive = activeTab === item.id
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl",
                      "text-sm font-medium transition-all duration-200",
                      "touch-manipulation active:scale-[0.98]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100"
                    )}
                  >
                    <Icon 
                      icon={item.icon} 
                      size="md"
                      className={isActive ? "text-white" : "text-zinc-500"}
                    />
                    <span>{item.title}</span>
                  </button>
                )
              })}
            </nav>

            {/* Footer actions */}
            <div className="p-2 border-t border-zinc-100 space-y-1">
              <Link href="/" onClick={onClose}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 px-3 rounded-xl"
                >
                  <Icon icon={Home} size="md" className="text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-700">На главную</span>
                </Button>
              </Link>
              
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 px-3 rounded-xl"
              >
                <Icon icon={Settings} size="md" className="text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">Настройки</span>
              </Button>

              {onLogout && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onClose()
                    onLogout()
                  }}
                  className="w-full justify-start gap-3 h-12 px-3 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Icon icon={LogOut} size="md" className="text-red-500" />
                  <span className="text-sm font-medium">Выйти</span>
                </Button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
