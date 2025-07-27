'use client'

import Link from 'next/link'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FolderOpen,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { iconVariants } from '@/lib/icon-variants'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  userRole?: 'student' | 'teacher'
  user?: {
    email: string
    name: string
    role: string
  } | null
  activeTab: string
  onTabChange: (tab: string) => void
}

const navigationItems = [
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

export function Sidebar({ isOpen = true, onClose, userRole = 'student', user, activeTab, onTabChange }: SidebarProps) {
  const filteredItems = navigationItems.filter(item => 
    !item.role || item.role === userRole
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "w-64 bg-white/95 backdrop-blur-xl border-r border-zinc-200/50 transform transition-all duration-300 ease-out flex-shrink-0",
        "lg:translate-x-0 lg:relative lg:z-auto",
        "fixed top-0 left-0 z-50 h-full",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header with logo and home button */}
          <div className="flex items-center justify-between mb-4 lg:mb-6 px-3 lg:px-4 pt-3 lg:pt-4">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Image
                src="/logo.svg"
                alt="Изучатор"
                width={24}
                height={24}
                className={iconVariants({ size: "responsiveLg" })}
              />
              <span className="text-base lg:text-lg font-semibold text-zinc-900">Изучатор</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="rounded-full h-8 w-8 p-0 hover:bg-zinc-100"
            >
              <Link href="/">
                <Icon icon={Home} size="responsiveLg" />
                <span className="sr-only">На главную</span>
              </Link>
            </Button>
          </div>

          {/* Profile card */}
          <div className="bg-zinc-50/80 rounded-xl border border-zinc-200/50 p-3 lg:p-4 mb-4 lg:mb-6 mx-3 lg:mx-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm lg:text-base font-medium flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'У'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-xs lg:text-sm text-zinc-900 truncate">{user?.name || 'Пользователь'}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email || 'email@example.com'}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  userRole === 'teacher' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {userRole === 'teacher' ? 'Преподаватель' : 'Ученик'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 lg:space-y-2 px-3 lg:px-4 pb-3 lg:pb-4">
            {filteredItems.map((item) => {
              const IconComponent = item.icon
              const isActive = activeTab === item.id
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    onTabChange(item.id)
                    onClose?.()
                  }}
                  className={cn(
                    "w-full justify-start px-3 lg:px-4 py-2.5 lg:py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-out group h-auto",
                    isActive
                      ? "bg-zinc-900 text-white shadow-lg hover:bg-zinc-700 hover:text-white"
                      : "text-zinc-700 hover:bg-zinc-100/80 hover:text-zinc-900"
                  )}
                >
                  <Icon 
                    icon={IconComponent} 
                    size="responsive" 
                    interactive={true}
                    className={cn(
                      "mr-2 lg:mr-3",
                      isActive ? "text-white" : "text-zinc-500"
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                </Button>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
