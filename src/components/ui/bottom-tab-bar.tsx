'use client'

import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FolderOpen,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

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
    title: 'Главная',
    icon: LayoutDashboard,
  },
  {
    id: 'planner',
    title: 'Планер',
    icon: Calendar,
  },
  {
    id: 'students',
    title: 'Ученики',
    icon: Users,
    role: 'teacher'
  },
  {
    id: 'teachers',
    title: 'Учителя',
    icon: Users,
    role: 'student'
  },
  {
    id: 'materials',
    title: 'Материалы',
    icon: FolderOpen,
  },
]

interface BottomTabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  userRole: 'student' | 'teacher'
}

export function BottomTabBar({ activeTab, onTabChange, userRole }: BottomTabBarProps) {
  const filteredItems = navigationItems.filter(item => !item.role || item.role === userRole)

  return (
    <nav 
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-zinc-200/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="tablist"
      aria-label="Навигация"
    >
      <div className="flex items-center justify-around px-2 h-16">
        {filteredItems.map((item) => {
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={item.title}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full",
                "min-w-[64px] max-w-[96px]", // Apple HIG minimum touch target
                "transition-colors duration-200",
                "active:scale-95 touch-manipulation",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 rounded-lg"
              )}
            >
              {/* Active indicator pill */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -top-0.5 w-8 h-1 bg-zinc-900 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              <Icon 
                icon={item.icon} 
                className={cn(
                  "mb-0.5 transition-colors duration-200",
                  isActive ? "text-zinc-900" : "text-zinc-400"
                )}
                size="md"
              />
              
              <span 
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-zinc-900" : "text-zinc-400"
                )}
              >
                {item.title}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
