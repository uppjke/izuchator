'use client'

import { useState, useCallback } from 'react'
import { Bell, Search, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  title: string
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function MobileHeader({ 
  title, 
  onMenuClick, 
  showMenuButton = false 
}: MobileHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const toggleSearch = useCallback(() => setIsSearchOpen(prev => !prev), [])
  const closeSearch = useCallback(() => setIsSearchOpen(false), [])

  return (
    <header 
      className={cn(
        "sticky top-0 z-40",
        "bg-white/95 backdrop-blur-xl",
        "border-b border-zinc-200/50",
        "px-4 h-14",
        "flex items-center justify-between",
        "safe-area-top" // iOS safe area
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center flex-1 min-w-0 gap-3">
        {/* Menu button - только для планшетов */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="flex-shrink-0 h-10 w-10 rounded-full"
            aria-label="Открыть меню"
          >
            <Icon icon={Menu} size="md" />
          </Button>
        )}

        <AnimatePresence mode="wait">
          {!isSearchOpen ? (
            <motion.h1
              key="title"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="text-lg font-semibold text-zinc-900 truncate"
            >
              {title}
            </motion.h1>
          ) : (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 relative"
            >
              <Icon 
                icon={Search} 
                size="sm" 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" 
              />
              <Input
                placeholder="Поиск..."
                className="pl-10 h-10 bg-zinc-100 border-0 rounded-xl"
                autoFocus
                onBlur={closeSearch}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isSearchOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSearch}
            className="h-10 w-10 rounded-full"
            aria-label="Поиск"
          >
            <Icon icon={Search} size="md" className="text-zinc-600" />
          </Button>
        )}

        {isSearchOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSearch}
            className="h-10 w-10 rounded-full"
            aria-label="Закрыть поиск"
          >
            <Icon icon={X} size="md" className="text-zinc-600" />
          </Button>
        )}

        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-10 w-10 rounded-full"
          aria-label="Уведомления"
        >
          <Icon icon={Bell} size="md" className="text-zinc-600" />
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
        </Button>
      </div>
    </header>
  )
}
