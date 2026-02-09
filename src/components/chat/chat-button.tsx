'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useChatContext } from '@/lib/chat-context'
import { cn } from '@/lib/utils'

interface ChatButtonProps {
  className?: string
  size?: 'sm' | 'md'
}

export function ChatButton({ className, size = 'md' }: ChatButtonProps) {
  const { totalUnread, setIsOpen, isOpen } = useChatContext()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'relative rounded-full',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className,
      )}
      aria-label={`Сообщения${totalUnread > 0 ? ` (${totalUnread} непрочитанных)` : ''}`}
    >
      <Icon
        icon={MessageCircle}
        size={size === 'sm' ? 'sm' : 'md'}
        className="text-zinc-600"
      />
      {totalUnread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none ring-2 ring-white">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </Button>
  )
}
