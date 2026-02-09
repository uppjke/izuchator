'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, X } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useChatContext } from '@/lib/chat-context'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

import type { ChatMessage } from '@/lib/api'

// ============================================================================
// Chat Sheet — slide-out панель чата
// ============================================================================

export function ChatSheet() {
  const {
    isOpen,
    setIsOpen,
    activeRelationId,
    setActiveRelationId,
  } = useChatContext()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
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

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50",
          "w-full sm:w-96 lg:w-[420px]",
          "bg-white shadow-2xl",
          "flex flex-col",
          "safe-area-top safe-area-bottom"
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
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
  const { partners, setIsOpen, setActiveRelationId, unreadCounts } = useChatContext()

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
          partners.map((partner) => {
            const unread = unreadCounts[partner.relationId] || 0
            const displayName = partner.customName || partner.name || partner.email

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
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {partner.email}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
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
  } = useChatContext()

  const { data: session } = useSession()
  const userId = session?.user?.id
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const partner = partners.find((p) => p.relationId === activeRelationId)
  const displayName = partner?.customName || partner?.name || partner?.email || 'Собеседник'

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
      >
        {hasMoreMessages && (
          <button
            onClick={loadMoreMessages}
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

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                  isLast={isLast}
                />
              )
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
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
              {isRead ? '✓✓' : '✓'}
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
