'use client'

import { useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface DesktopHeaderProps {
  title: string
}

export function DesktopHeader({ title }: DesktopHeaderProps) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <header 
      className={cn(
        "hidden lg:flex",
        "sticky top-0 z-40",
        "bg-white/95 backdrop-blur-xl",
        "border-b border-zinc-200/50",
        "px-6 h-16",
        "items-center justify-between"
      )}
    >
      {/* Page title */}
      <h1 className="text-2xl font-semibold text-zinc-900">
        {title}
      </h1>

      {/* Right side - Search and notifications */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-80">
          <Icon 
            icon={Search} 
            size="sm" 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" 
          />
          <Input
            type="search"
            placeholder="Поиск..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white"
          />
        </div>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-10 w-10 rounded-full hover:bg-zinc-100"
          aria-label="Уведомления"
        >
          <Icon icon={Bell} size="md" className="text-zinc-600" />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white">
            <span className="sr-only">Новые уведомления</span>
          </span>
        </Button>
      </div>
    </header>
  )
}
