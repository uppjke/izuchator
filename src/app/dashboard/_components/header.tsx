'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DashboardHeaderProps {
  onMenuClick: () => void
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Дашборд',
  '/dashboard/planner': 'Планер',
  '/dashboard/students': 'Мои ученики',
  '/dashboard/teachers': 'Мои преподаватели',
  '/dashboard/materials': 'Мои материалы',
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()
  
  const currentPageName = pageNames[pathname] || 'Дашборд'

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden rounded-full h-9 w-9 p-0"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative rounded-full h-9 w-9 p-0">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
              <span className="sr-only">Новые уведомления</span>
            </span>
          </Button>

          {/* Search - Desktop */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Поиск..."
              className="pl-10 w-80 bg-zinc-50/80 border-zinc-200/50"
            />
          </div>

          {/* Search - Mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden rounded-full h-9 w-9 p-0"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Page title */}
        <div className="flex-1 text-center lg:text-left lg:ml-8">
          <h1 className="text-xl font-semibold text-zinc-900">
            {currentPageName}
          </h1>
        </div>

        {/* Right side - can be extended with user menu, etc. */}
        <div className="w-10 lg:w-auto">
          {/* Placeholder for future user menu or other actions */}
        </div>
      </div>

      {/* Mobile search */}
      {isSearchOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-zinc-200/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Поиск..."
              className="pl-10 w-full bg-zinc-50/80 border-zinc-200/50"
            />
          </div>
        </div>
      )}
    </header>
  )
}
