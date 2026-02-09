'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface DesktopHeaderProps {
  title: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  showSearch?: boolean
}

export function DesktopHeader({ title, searchQuery = '', onSearchChange, showSearch = true }: DesktopHeaderProps) {
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

      {/* Right side - Search */}
      {showSearch && (
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Icon 
              icon={Search} 
              size="sm" 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" 
            />
            <Input
              type="search"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white"
            />
          </div>
        </div>
      )}
    </header>
  )
}
