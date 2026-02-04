'use client'

import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { ProfileSheet } from '@/components/ui/profile-sheet'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  title: string
  user?: {
    email?: string
    name?: string
    role?: string
  } | null
  userRole?: 'student' | 'teacher'
  onLogout?: () => void
}

export function MobileHeader({ 
  title, 
  user,
  userRole = 'student',
  onLogout
}: MobileHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

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

        {/* Profile avatar */}
        <button
          onClick={() => setIsProfileOpen(true)}
          className="h-10 w-10 rounded-full flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
          aria-label="Профиль"
        >
          <UserAvatar 
            user={{
              name: user?.name,
              email: user?.email,
              avatar_url: null
            }}
            size="sm"
          />
        </button>
      </div>

      {/* Profile Sheet */}
      <ProfileSheet
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        userRole={userRole}
        onLogout={onLogout}
      />
    </header>
  )
}
