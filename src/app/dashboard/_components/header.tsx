'use client'

import { useState, useCallback } from 'react'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/icon'

interface DashboardHeaderProps {
  onMenuClick: () => void
  activeTab: string
}

const tabNames: Record<string, string> = {
  dashboard: 'Дашборд',
  planner: 'Планер',
  students: 'Мои ученики',
  teachers: 'Мои преподаватели',
  materials: 'Мои материалы',
}

export function DashboardHeader({ onMenuClick, activeTab }: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  const currentPageName = tabNames[activeTab] || 'Дашборд'

  // Общие настройки
  const fadeTransition = { duration: 0.2, ease: "easeInOut" as const }
  const buttonClasses = "rounded-full h-9 w-9 p-0 flex-shrink-0"
  const searchInputClasses = "pl-10 bg-zinc-50/80 border-zinc-200/50"
  
  const toggleSearch = useCallback(() => setIsSearchOpen(prev => !prev), [])
  const closeSearch = useCallback(() => setIsSearchOpen(false), [])

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 px-4 lg:px-6 py-4 w-full">
      <div className="flex items-center justify-between max-w-full">
        {/* Left side - Page title and mobile menu */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className={`lg:hidden ${buttonClasses}`}
          >
            <Icon icon={Menu} size="lg" />
          </Button>

          <AnimatePresence mode="wait">
            {/* Page title - hidden when mobile search is open */}
            {!isSearchOpen && (
              <motion.h1
                key="title"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={fadeTransition}
                className="text-xl lg:text-2xl font-semibold text-zinc-900"
                style={{ marginLeft: '1.5rem' }}
              >
                {currentPageName}
              </motion.h1>
            )}
            
            {/* Mobile search - replaces title when open */}
            {isSearchOpen && (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={fadeTransition}
                className="flex-1 md:hidden relative min-w-0"
              >
                <Icon icon={Search} size="xs" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Поиск..."
                  className={`w-full ${searchInputClasses}`}
                  autoFocus
                  onBlur={closeSearch}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side - Search and notifications */}
        <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0 relative">
          {/* Search - Desktop */}
          <div className="hidden md:flex items-center relative">
            <Icon icon={Search} size="sm" className="absolute left-3 text-zinc-400" />
            <Input
              placeholder="Поиск..."
              className={searchInputClasses}
              style={{ width: '384px' }}
            />
          </div>

          {/* Search - Mobile (absolute positioned) */}
          <AnimatePresence>
            {!isSearchOpen && (
              <motion.div
                key="search-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={fadeTransition}
                className="md:hidden absolute right-12 z-10"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSearch}
                  className={buttonClasses}
                >
                  <Icon icon={Search} size="lg" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className={`relative ${buttonClasses}`}>
            <Icon icon={Bell} size="lg" />
            {/* Notification badge */}
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border border-white">
              <span className="sr-only">Новые уведомления</span>
            </span>
          </Button>
        </div>
      </div>
    </header>
  )
}
