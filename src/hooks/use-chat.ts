'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'
import {
  getChatMessages,
  sendChatMessage,
  markMessagesRead,
  getUnreadCounts,
  getTeacherStudents,
  getStudentTeachers,
} from '@/lib/api'
import type { ChatMessage, UnreadResponse } from '@/lib/api'

interface ChatPartner {
  id: string
  name: string | null
  email: string
  relationId: string
  customName?: string | null
}

interface UseChatReturn {
  // Список чатов (партнёры)
  partners: ChatPartner[]
  partnersLoading: boolean
  // Активный чат
  activeRelationId: string | null
  setActiveRelationId: (id: string | null) => void
  // Сообщения
  messages: ChatMessage[]
  messagesLoading: boolean
  hasMoreMessages: boolean
  loadMoreMessages: () => void
  // Отправка
  sendMessage: (text: string) => Promise<void>
  // Непрочитанные
  unreadCounts: Record<string, number>
  totalUnread: number
  // Typing
  typingUsers: Set<string>
  sendTyping: () => void
  // Открытие/закрытие
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function useChat(): UseChatReturn {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const userRole = (session?.user as { role?: string })?.role?.toLowerCase()
  const queryClient = useQueryClient()

  const [isOpen, setIsOpen] = useState(false)
  const [activeRelationId, setActiveRelationId] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingSentRef = useRef<number>(0)

  // Получаем партнёров — через существующие relations
  const isTeacher = userRole === 'teacher'

  const { data: teacherRelations = [] } = useQuery({
    queryKey: ['relations', 'teacher'],
    queryFn: getTeacherStudents,
    enabled: isTeacher,
    staleTime: 60000,
  })

  const { data: studentRelations = [] } = useQuery({
    queryKey: ['relations', 'student'],
    queryFn: getStudentTeachers,
    enabled: !isTeacher,
    staleTime: 60000,
  })

  const relations = isTeacher ? teacherRelations : studentRelations

  const partners: ChatPartner[] = (relations || []).map((rel: Record<string, unknown>) => {
    const partner = isTeacher ? (rel as any).student : (rel as any).teacher
    const customName = isTeacher ? (rel as any).studentName : (rel as any).teacherName
    return {
      id: partner?.id || '',
      name: partner?.name || null,
      email: partner?.email || '',
      relationId: (rel as any).id || '',
      customName,
    }
  })

  // Непрочитанные
  const { data: unreadData } = useQuery<UnreadResponse>({
    queryKey: ['chat', 'unread'],
    queryFn: getUnreadCounts,
    refetchInterval: 30000,
    enabled: !!userId && partners.length > 0,
    retry: 2,
    retryDelay: 5000,
  })

  const unreadCounts = unreadData?.unread || {}
  const totalUnread = unreadData?.total || 0

  // Сообщения для активного чата (infinite query, cursor-based)
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['chat', 'messages', activeRelationId],
    queryFn: ({ pageParam }) =>
      getChatMessages(activeRelationId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!activeRelationId,
  })

  // Собираем сообщения из всех страниц (reversed — чтобы старые вверху)
  const messages = (messagesData?.pages.flatMap((p) => p.messages) || []).reverse()

  // Socket.io для real-time
  // Delayed connection to survive React 19 Strict Mode double-invoke
  useEffect(() => {
    if (!userId) return

    const envUrl = process.env.NEXT_PUBLIC_PRESENCE_SERVER
    let presenceUrl: string
    if (envUrl) {
      try {
        const url = new URL(envUrl)
        url.hostname = window.location.hostname
        presenceUrl = url.origin
      } catch {
        presenceUrl = envUrl
      }
    } else {
      presenceUrl = `${window.location.protocol}//${window.location.hostname}:3002`
    }

    let mounted = true
    let socket: Socket | null = null

    // Delay to survive React 19 StrictMode unmount-remount cycle
    const connectTimer = setTimeout(() => {
      if (!mounted) return

      socket = io(presenceUrl, {
        transports: ['websocket'],
        reconnection: true,
        forceNew: false,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        partners.forEach((p) => {
          socket!.emit('chat:join', { relationId: p.relationId })
        })
      })

      // Новое сообщение
      socket.on('chat:message' as any, (message: ChatMessage) => {
        queryClient.setQueryData(
          ['chat', 'messages', message.relationId],
          (old: any) => {
            if (!old) return old
            const firstPage = old.pages[0]
            return {
              ...old,
              pages: [
                { ...firstPage, messages: [message, ...firstPage.messages] },
                ...old.pages.slice(1),
              ],
            }
          },
        )
        if (message.relationId !== activeRelationId || !isOpen) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] })
        }
      })

      // Typing
      socket.on('chat:typing' as any, ({ userId: typerId }: { userId: string }) => {
        setTypingUsers((prev) => new Set(prev).add(typerId))
      })
      socket.on('chat:stop-typing' as any, ({ userId: typerId }: { userId: string }) => {
        setTypingUsers((prev) => {
          const next = new Set(prev)
          next.delete(typerId)
          return next
        })
      })

      // Read receipt
      socket.on('chat:read' as any, (_data: { userId: string; messageIds: string[] }) => {
        if (activeRelationId) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'messages', activeRelationId] })
        }
      })
    }, 100) // 100ms delay — StrictMode cleanup fires before this

    return () => {
      mounted = false
      clearTimeout(connectTimer)
      if (socket) {
        partners.forEach((p) => {
          socket!.emit('chat:leave', { relationId: p.relationId })
        })
        socket.disconnect()
      }
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, partners.length])

  // Перезаходим в комнату при смене активного чата
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !activeRelationId) return

    socket.emit('chat:join', { relationId: activeRelationId })
  }, [activeRelationId])

  // Автоматически отмечаем прочитанными при открытии чата
  useEffect(() => {
    if (!activeRelationId || !isOpen || !userId) return

    const unreadMsgs = messages.filter(
      (m) => m.senderId !== userId && !m.reads?.some((r) => r.userId === userId),
    )
    if (unreadMsgs.length === 0) return

    const ids = unreadMsgs.map((m) => m.id)
    markMessagesRead(activeRelationId, ids).then(() => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] })
      // Уведомляем собеседника
      socketRef.current?.emit('chat:read' as any, {
        relationId: activeRelationId,
        userId,
        messageIds: ids,
      })
    })
  }, [activeRelationId, isOpen, messages, userId, queryClient])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeRelationId || !text.trim()) return

      const message = await sendChatMessage(activeRelationId, text)

      // Optimistic: добавляем в кэш
      queryClient.setQueryData(
        ['chat', 'messages', activeRelationId],
        (old: any) => {
          if (!old) return old
          const firstPage = old.pages[0]
          return {
            ...old,
            pages: [
              { ...firstPage, messages: [message, ...firstPage.messages] },
              ...old.pages.slice(1),
            ],
          }
        },
      )

      // Рассылаем через socket
      socketRef.current?.emit('chat:message' as any, {
        relationId: activeRelationId,
        message,
      })

      // Stop typing
      socketRef.current?.emit('chat:stop-typing' as any, {
        relationId: activeRelationId,
        userId,
      })
    },
    [activeRelationId, userId, queryClient],
  )

  const sendTyping = useCallback(() => {
    if (!activeRelationId || !userId) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return // throttle 2s
    lastTypingSentRef.current = now

    socketRef.current?.emit('chat:typing' as any, {
      relationId: activeRelationId,
      userId,
    })

    // Автоматически stop-typing через 3s
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:stop-typing' as any, {
        relationId: activeRelationId,
        userId,
      })
    }, 3000)
  }, [activeRelationId, userId])

  return {
    partners,
    partnersLoading: false,
    activeRelationId,
    setActiveRelationId,
    messages,
    messagesLoading,
    hasMoreMessages: !!hasNextPage,
    loadMoreMessages: () => fetchNextPage(),
    sendMessage,
    unreadCounts,
    totalUnread,
    typingUsers,
    sendTyping,
    isOpen,
    setIsOpen,
  }
}
