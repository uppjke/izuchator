'use client'

import Link from 'next/link'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FolderOpen,
  Home,
  LogOut,
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

interface DesktopSidebarProps {
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

export function DesktopSidebar({
  userRole,
  user,
  activeTab,
  onTabChange,
  onLogout,
}: DesktopSidebarProps) {
  const filteredItems = navigationItems.filter(item => !item.role || item.role === userRole)

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-zinc-200/50 flex-shrink-0">
      {/* Header with logo */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Изучатор"
            width={28}
            height={28}
            className="w-7 h-7"
          />
          <span className="text-lg font-semibold text-zinc-900">Изучатор</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8 rounded-full hover:bg-zinc-100"
        >
          <Link href="/">
            <Icon icon={Home} size="sm" className="text-zinc-500" />
            <span className="sr-only">На главную</span>
          </Link>
        </Button>
      </div>

      {/* User profile card */}
      <div className="p-4">
        <div className="bg-zinc-50 rounded-xl p-3">
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                "text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
                isActive
                  ? "bg-zinc-900 text-white shadow-lg"
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
      <div className="p-3 border-t border-zinc-100">
        {onLogout && (
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start gap-3 h-10 px-4 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Icon icon={LogOut} size="sm" className="text-red-500" />
            <span className="text-sm font-medium">Выйти</span>
          </Button>
        )}
      </div>
    </aside>
  )
}
