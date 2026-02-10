'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, X, ChevronDown as ChevronDownIcon, RotateCw } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useChatContext } from '@/lib/chat-context'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

import type { ChatMessage } from '@/lib/api'

// Hook: lock body scroll on mobile when chat is open
function useLockBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return
    if (window.innerWidth >= 640) return

    const body = document.body
    const prev = body.style.overflow
    body.style.overflow = 'hidden'

    return () => {
      body.style.overflow = prev
    }
  }, [isOpen])
}

// ============================================================================
// Chat Popup — плавающее окно чата
// ============================================================================

export function ChatSheet() {
  const {
    isOpen,
    setIsOpen,
    activeRelationId,
    setActiveRelationId,
  } = useChatContext()

  const popupRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [isTablet, setIsTablet] = useState(false)
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Fix mobile virtual keyboard
  useLockBodyScroll(isOpen)

  if (!isOpen) return null

  // Inline styles for reliable positioning across Tailwind 4
  const popupStyle: React.CSSProperties = isMobile
    ? {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 'env(safe-area-inset-top)',
      }
    : {
        top: 'auto',
        left: 'auto',
        right: 16,
        bottom: isTablet ? 88 : 16, // 88px = tab bar (64) + gap (24) | 16px on desktop
        width: 380,
        height: 'min(560px, calc(100dvh - 120px))',
        borderRadius: 16,
        paddingTop: 0,
        paddingBottom: 0,
      }

  return (
    <>
      {/* Backdrop — только на мобильных (full-screen режим) */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50"
          onClick={() => {
            if (activeRelationId) {
              setActiveRelationId(null)
            } else {
              setIsOpen(false)
            }
          }}
        />
      )}

      {/* Popup */}
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className={cn(
          "fixed z-50",
          "bg-white",
          "shadow-2xl",
          !isMobile && "border border-zinc-200/60",
          "flex flex-col overflow-hidden",
        )}
        style={popupStyle}
      >
        <AnimatePresence mode="wait">
          {activeRelationId ? (
            <ChatThread key="thread" />
          ) : (
            <ChatList key="list" />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}

// ============================================================================
// Список чатов
// ============================================================================

function ChatList() {
  const { partners, setIsOpen, setActiveRelationId, unreadCounts, lastMessages } = useChatContext()
  const { data: session } = useSession()
  const userId = session?.user?.id

  // Сортируем: чаты с последним сообщением — по дате (новые сверху), остальные — в конце
  const sortedPartners = [...partners].sort((a, b) => {
    const lastA = lastMessages[a.relationId]
    const lastB = lastMessages[b.relationId]
    if (lastA && lastB) return new Date(lastB.createdAt).getTime() - new Date(lastA.createdAt).getTime()
    if (lastA) return -1
    if (lastB) return 1
    return 0
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/50">
        <h2 className="text-lg font-semibold text-zinc-900">Сообщения</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-9 w-9 rounded-full"
        >
          <Icon icon={X} size="sm" />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <p className="text-zinc-500 text-sm">Нет доступных чатов</p>
            <p className="text-zinc-400 text-xs mt-1">Добавьте ученика или учителя, чтобы начать общение</p>
          </div>
        ) : (
          sortedPartners.map((partner) => {
            const unread = unreadCounts[partner.relationId] || 0
            const displayName = partner.customName || partner.name || partner.email
            const lastMsg = lastMessages[partner.relationId]

            // Формируем превью: "Вы: текст" или просто "текст"
            let previewText = partner.email
            if (lastMsg) {
              const isMine = lastMsg.senderId === userId
              const truncated = lastMsg.text.length > 40
                ? lastMsg.text.slice(0, 40) + '…'
                : lastMsg.text
              previewText = isMine ? `Вы: ${truncated}` : truncated
            }

            // Время последнего сообщения
            const lastTime = lastMsg ? formatPreviewTime(lastMsg.createdAt) : null

            return (
              <button
                key={partner.relationId}
                onClick={() => setActiveRelationId(partner.relationId)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left"
              >
                <UserAvatar
                  user={{ name: partner.name ?? undefined, email: partner.email, avatar_url: null }}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "text-sm truncate",
                      unread > 0 ? "font-semibold text-zinc-900" : "font-medium text-zinc-900"
                    )}>
                      {displayName}
                    </p>
                    {lastTime && (
                      <span className={cn(
                        "text-[11px] flex-shrink-0",
                        unread > 0 ? "text-blue-500 font-medium" : "text-zinc-400"
                      )}>
                        {lastTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={cn(
                      "text-xs truncate",
                      unread > 0 ? "text-zinc-700 font-medium" : "text-zinc-500"
                    )}>
                      {previewText}
                    </p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Thread — переписка с одним партнёром
// ============================================================================

function ChatThread() {
  const {
    activeRelationId,
    setActiveRelationId,
    setIsOpen,
    partners,
    messages,
    messagesLoading,
    hasMoreMessages,
    loadMoreMessages,
    sendMessage,
    typingUsers,
    sendTyping,
    failedMessageIds,
    retryMessage,
    dismissFailedMessage,
  } = useChatContext()

  const { data: session } = useSession()
  const userId = session?.user?.id
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showScrollFab, setShowScrollFab] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevMessageCountRef = useRef(0)
  const isLoadingOlderRef = useRef(false)

  const partner = partners.find((p) => p.relationId === activeRelationId)
  const displayName = partner?.customName || partner?.name || partner?.email || 'Собеседник'

  // Scroll to bottom only for NEW messages (not load-older or viewport resize)
  const viewportResizingRef = useRef(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    let timer: NodeJS.Timeout
    const onResize = () => {
      viewportResizingRef.current = true
      clearTimeout(timer)
      timer = setTimeout(() => { viewportResizingRef.current = false }, 300)
    }
    viewport.addEventListener('resize', onResize)
    return () => {
      viewport.removeEventListener('resize', onResize)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const currentCount = messages.length
    const prevCount = prevMessageCountRef.current

    if (currentCount > prevCount && !isLoadingOlderRef.current && !viewportResizingRef.current) {
      // New messages arrived — scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    // Reset load-older flag after render
    isLoadingOlderRef.current = false
    prevMessageCountRef.current = currentCount
  }, [messages.length])

  // Track scroll position for FAB
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollFab(distanceFromBottom > 150)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleLoadOlder = useCallback(() => {
    isLoadingOlderRef.current = true
    loadMoreMessages()
  }, [loadMoreMessages])

  // Фокус на input при открытии
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(text.trim())
      setText('')
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
        inputRef.current.style.overflow = 'hidden'
      }
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }, [text, sending, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // Группируем сообщения по дате
  const groupedMessages = groupMessagesByDate(messages)

  const isPartnerTyping = Array.from(typingUsers).some((id) => id !== userId)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-200/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveRelationId(null)}
          className="h-9 w-9 rounded-full flex-shrink-0"
        >
          <Icon icon={ArrowLeft} size="sm" />
        </Button>
        <UserAvatar
          user={{ name: partner?.name ?? undefined, email: partner?.email, avatar_url: null }}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 truncate">{displayName}</p>
          {isPartnerTyping && (
            <p className="text-xs text-blue-500">печатает...</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setActiveRelationId(null)
            setIsOpen(false)
          }}
          className="h-9 w-9 rounded-full flex-shrink-0"
        >
          <Icon icon={X} size="sm" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 relative"
      >
        {hasMoreMessages && (
          <button
            onClick={handleLoadOlder}
            className="w-full text-center text-xs text-blue-500 hover:text-blue-700 py-2"
          >
            Загрузить ранние сообщения
          </button>
        )}

        {messagesLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-900 border-t-transparent" />
          </div>
        )}

        {!messagesLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-zinc-400 text-sm">Начните общение</p>
          </div>
        )}

        {groupedMessages.map(({ date, messages: dayMessages }) => (
          <div key={date}>
            <div className="flex items-center justify-center my-3">
              <span className="text-[11px] text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                {formatDateLabel(date)}
              </span>
            </div>
            {dayMessages.map((msg, idx) => {
              const isMine = msg.senderId === userId
              const showAvatar = !isMine && (idx === 0 || dayMessages[idx - 1]?.senderId !== msg.senderId)
              const isLast = idx === dayMessages.length - 1 || dayMessages[idx + 1]?.senderId !== msg.senderId
              const isFailed = failedMessageIds.has(msg.id)

              return (
                <div key={msg.id}>
                  <MessageBubble
                    message={msg}
                    isMine={isMine}
                    showAvatar={showAvatar}
                    isLast={isLast && !isFailed}
                  />
                  {isFailed && (
                    <div className={cn('flex gap-1.5 mb-2', isMine ? 'justify-end' : 'justify-start')}>
                      <button
                        onClick={() => retryMessage(msg.id)}
                        className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Icon icon={RotateCw} size="xs" />
                        Повторить
                      </button>
                      <button
                        onClick={() => dismissFailedMessage(msg.id)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom FAB */}
        {showScrollFab && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors z-10"
          >
            <Icon icon={ChevronDownIcon} size="sm" className="text-zinc-600" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200/50 px-3 py-2 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              sendTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-2xl px-4 py-2.5",
              "bg-zinc-100 border-0",
              "text-sm text-zinc-900 placeholder:text-zinc-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white",
              "max-h-32 min-h-[40px]",
              "transition-colors"
            )}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
              target.style.overflow = target.scrollHeight > 128 ? 'auto' : 'hidden'
            }}
          />
          <Button
            size="icon"
            disabled={!text.trim() || sending}
            onClick={handleSend}
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0 disabled:opacity-40"
          >
            <Icon icon={Send} size="sm" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Bubble
// ============================================================================

interface MessageBubbleProps {
  message: {
    id: string
    text: string
    createdAt: string
    senderId: string
    sender: { name: string | null; email: string; image: string | null }
    reads: Array<{ userId: string; readAt: string }>
  }
  isMine: boolean
  showAvatar: boolean
  isLast: boolean
}

function MessageBubble({ message, isMine, showAvatar, isLast }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), 'HH:mm')
  const isRead = message.reads.length > 0
  const isTemp = message.id.startsWith('temp-')

  return (
    <div
      className={cn(
        'flex gap-2',
        isMine ? 'justify-end' : 'justify-start',
        isLast ? 'mb-2' : 'mb-0.5',
      )}
    >
      {!isMine && (
        <div className="w-7 flex-shrink-0">
          {showAvatar && (
            <UserAvatar
              user={{
                name: message.sender.name ?? undefined,
                email: message.sender.email,
                avatar_url: message.sender.image,
              }}
              size="xs"
            />
          )}
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] px-3.5 py-2 text-sm leading-relaxed',
          isMine
            ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
            : 'bg-zinc-100 text-zinc-900 rounded-2xl rounded-bl-md',
          isTemp && 'opacity-70',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div
          className={cn(
            'flex items-center gap-1 mt-0.5',
            isMine ? 'justify-end' : 'justify-start',
          )}
        >
          <span
            className={cn(
              'text-[10px]',
              isMine ? 'text-blue-200' : 'text-zinc-400',
            )}
          >
            {time}
          </span>
          {isMine && (
            <span className={cn('text-[10px]', isRead ? 'text-blue-200' : 'text-blue-300/60')}>
              {isTemp ? '○' : isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ''

  for (const msg of messages) {
    const date = new Date(msg.createdAt).toDateString()
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date, messages: [msg] })
    } else {
      groups[groups.length - 1]!.messages.push(msg)
    }
  }

  return groups
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  return format(date, 'd MMMM yyyy', { locale: ru })
}

function formatPreviewTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Вчера'
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays < 7) return format(date, 'EEEEEE', { locale: ru }) // Пн, Вт...
  return format(date, 'dd.MM', { locale: ru })
}
