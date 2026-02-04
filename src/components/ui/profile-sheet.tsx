'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { 
  Settings, 
  LogOut, 
  Home,
  ChevronRight,
  Moon,
  Bell as BellIcon,
  HelpCircle,
  Shield
} from 'lucide-react'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'

interface ProfileSheetProps {
  isOpen: boolean
  onClose: () => void
  user?: {
    email?: string
    name?: string
    role?: string
  } | null
  userRole: 'student' | 'teacher'
  onLogout?: () => void
}

interface MenuItemProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'danger'
  disabled?: boolean
}

function MenuItem({ icon: IconComponent, label, onClick, href, variant = 'default', disabled }: MenuItemProps) {
  const content = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3.5",
        "transition-colors duration-150",
        "touch-manipulation active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:bg-zinc-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === 'danger' 
          ? "text-red-600 hover:bg-red-50 active:bg-red-100" 
          : "text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon 
          icon={IconComponent} 
          size="md" 
          className={variant === 'danger' ? "text-red-500" : "text-zinc-500"} 
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Icon icon={ChevronRight} size="sm" className="text-zinc-400" />
    </button>
  )

  if (href) {
    return (
      <Link href={href} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return content
}

export function ProfileSheet({ 
  isOpen, 
  onClose, 
  user, 
  userRole,
  onLogout 
}: ProfileSheetProps) {
  
  const handleLogout = () => {
    onClose()
    onLogout?.()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-sm p-0 flex flex-col"
      >
        <SheetHeader className="p-6 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-4">
            <UserAvatar 
              user={{
                name: user?.name,
                email: user?.email,
                avatar_url: null
              }}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">
                {user?.name || 'Пользователь'}
              </SheetTitle>
              <SheetDescription className="truncate">
                {user?.email || 'email@example.com'}
              </SheetDescription>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1.5",
                userRole === 'teacher' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              )}>
                {userRole === 'teacher' ? 'Преподаватель' : 'Ученик'}
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Menu sections */}
        <div className="flex-1 overflow-y-auto">
          {/* Main section */}
          <div className="py-2">
            <MenuItem 
              icon={Home} 
              label="На главную" 
              href="/"
              onClick={onClose}
            />
          </div>

          <div className="h-2 bg-zinc-100" />

          {/* Settings section */}
          <div className="py-2">
            <MenuItem 
              icon={Settings} 
              label="Настройки профиля" 
              disabled
              onClick={() => {/* TODO: открыть настройки */}}
            />
            <MenuItem 
              icon={BellIcon} 
              label="Уведомления" 
              disabled
              onClick={() => {/* TODO: открыть настройки уведомлений */}}
            />
            <MenuItem 
              icon={Moon} 
              label="Тема оформления" 
              disabled
              onClick={() => {/* TODO: переключить тему */}}
            />
          </div>

          <div className="h-2 bg-zinc-100" />

          {/* Support section */}
          <div className="py-2">
            <MenuItem 
              icon={HelpCircle} 
              label="Помощь и поддержка" 
              disabled
              onClick={() => {/* TODO: открыть помощь */}}
            />
            <MenuItem 
              icon={Shield} 
              label="Конфиденциальность" 
              disabled
              onClick={() => {/* TODO: открыть политику */}}
            />
          </div>
        </div>

        {/* Footer with logout */}
        <SheetFooter className="p-4 border-t border-zinc-100">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-12 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <Icon icon={LogOut} size="md" className="mr-2 text-red-500" />
            Выйти из аккаунта
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
