'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FolderOpen,
  X 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  userRole?: 'student' | 'teacher'
  user?: {
    email: string
    name: string
    role: string
  } | null
}

const navigationItems = [
  {
    title: 'Дашборд',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Планер',
    href: '/dashboard/planner',
    icon: Calendar,
  },
  {
    title: 'Мои ученики',
    href: '/dashboard/students',
    icon: Users,
    role: 'teacher'
  },
  {
    title: 'Мои преподаватели',
    href: '/dashboard/teachers',
    icon: Users,
    role: 'student'
  },
  {
    title: 'Мои материалы',
    href: '/dashboard/materials',
    icon: FolderOpen,
  },
]

export function Sidebar({ isOpen = true, onClose, userRole = 'student', user }: SidebarProps) {
  const pathname = usePathname()

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
        <div className="flex flex-col h-full p-3 lg:p-4">
          {/* Header with logo and close button */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <Link href="/" className="flex items-center space-x-2 lg:space-x-3">
              <Image
                src="/logo.svg"
                alt="Изучатор"
                width={20}
                height={20}
                className="w-5 h-5 lg:w-6 lg:h-6"
              />
              <span className="text-base lg:text-lg font-semibold text-zinc-900">Изучатор</span>
            </Link>
            
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden rounded-full h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Profile card */}
          <div className="bg-zinc-50/80 rounded-xl border border-zinc-200/50 p-3 lg:p-4 mb-4 lg:mb-6">
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
          <nav className="flex-1 space-y-1 lg:space-y-2">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center px-3 lg:px-4 py-2.5 lg:py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-out group",
                    isActive
                      ? "bg-zinc-900 text-white shadow-lg"
                      : "text-zinc-700 hover:bg-zinc-100/80 hover:text-zinc-900"
                  )}
                >
                  <Icon className={cn(
                    "mr-2 lg:mr-3 h-4 w-4 lg:h-5 lg:w-5 transition-transform duration-200 group-hover:scale-110 flex-shrink-0",
                    isActive ? "text-white" : "text-zinc-500"
                  )} />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
