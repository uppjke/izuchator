'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import type { ChatMessage, UnreadResponse, LastMessagePreview } from '@/lib/api'

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
  // Превью последних сообщений
  lastMessages: Record<string, LastMessagePreview>
  // Typing
  typingUsers: Set<string>
  sendTyping: () => void
  // Открытие/закрытие
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

// ============================================================================
// Resolve presence server URL (shared helper)
// ============================================================================
function getPresenceUrl(): string | null {
  const envUrl = process.env.NEXT_PUBLIC_PRESENCE_SERVER
  if (!envUrl) return null
  try {
    const url = new URL(envUrl)
    url.hostname = window.location.hostname
    return url.origin
  } catch {
    return envUrl
  }
}

export function useChat(): UseChatReturn {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const userName = session?.user?.name ?? null
  const userEmail = session?.user?.email ?? ''
  const userImage = (session?.user as any)?.image ?? null
  const userRole = (session?.user as { role?: string })?.role?.toLowerCase()
  const queryClient = useQueryClient()

  const [isOpen, setIsOpen] = useState(false)
  const [activeRelationId, setActiveRelationId] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [socketConnected, setSocketConnected] = useState(false)
  // Локальные lastMessages из real-time обновлений (перекрывают API данные)
  const [realtimeLastMessages, setRealtimeLastMessages] = useState<Record<string, LastMessagePreview>>({})
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

  // Непрочитанные + последние сообщения (из API)
  // Aggressive polling (5s) as reliable fallback;
  // socket provides instant delivery when connected
  const { data: unreadData } = useQuery<UnreadResponse>({
    queryKey: ['chat', 'unread'],
    queryFn: getUnreadCounts,
    refetchInterval: socketConnected ? 30000 : 5000,
    enabled: !!userId && partners.length > 0,
    retry: 2,
    retryDelay: 5000,
  })

  const unreadCounts = unreadData?.unread || {}
  const totalUnread = unreadData?.total || 0

  // Комбинируем API lastMessages + real-time обновления (real-time приоритетнее)
  const lastMessages = useMemo(() => {
    const apiMessages = unreadData?.lastMessages || {}
    return { ...apiMessages, ...realtimeLastMessages }
  }, [unreadData?.lastMessages, realtimeLastMessages])

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

  // Helper: обновить lastMessage для relation
  const updateLastMessage = useCallback((relationId: string, message: { text: string; senderId: string; createdAt: string; sender: { name: string | null } }) => {
    setRealtimeLastMessages((prev) => ({
      ...prev,
      [relationId]: {
        text: message.text,
        senderId: message.senderId,
        createdAt: message.createdAt,
        senderName: message.sender.name,
      },
    }))
  }, [])

  // Helper: добавить сообщение в кэш (создаёт запись если кэш пуст)
  const addMessageToCache = useCallback((relationId: string, message: ChatMessage) => {
    queryClient.setQueryData(
      ['chat', 'messages', relationId],
      (old: any) => {
        if (!old) {
          return {
            pages: [{ messages: [message], nextCursor: null }],
            pageParams: [undefined],
          }
        }
        // Дедупликация: по id или по tempId
        const allMsgs = old.pages.flatMap((p: any) => p.messages)
        if (allMsgs.some((m: any) => m.id === message.id)) return old
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
  }, [queryClient])

  // Helper: заменить temp сообщение на сохранённое
  const replaceTempMessage = useCallback((relationId: string, tempId: string, saved: ChatMessage) => {
    queryClient.setQueryData(
      ['chat', 'messages', relationId],
      (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) =>
              m.id === tempId ? saved : m,
            ),
          })),
        }
      },
    )
  }, [queryClient])

  // ========================================================================
  // Socket.io — shared connection with presence (forceNew: false)
  // Presence hook connects first; we reuse the same socket.
  // ========================================================================
  useEffect(() => {
    if (!userId || partners.length === 0) return

    const presenceUrl = getPresenceUrl()
    if (!presenceUrl) return

    let mounted = true
    let socket: Socket | null = null

    const joinAllRooms = () => {
      if (!socket) return
      partners.forEach((p) => {
        socket!.emit('chat:join', { relationId: p.relationId })
      })
      console.log(`💬 Chat: joined ${partners.length} room(s)`)
    }

    const onConnect = () => {
      if (!mounted) return
      console.log('💬 Chat socket connected:', socket?.id)
      setSocketConnected(true)
      joinAllRooms()
    }

    const onDisconnect = () => {
      if (!mounted) return
      console.log('💬 Chat socket disconnected')
      setSocketConnected(false)
    }

    const onMessage = (message: ChatMessage) => {
      if (!mounted) return
      addMessageToCache(message.relationId, message)
      updateLastMessage(message.relationId, message)
      // Optimistic badge increment
      queryClient.setQueryData<UnreadResponse>(['chat', 'unread'], (old) => {
        if (!old) return old
        const newUnread = { ...old.unread }
        newUnread[message.relationId] = (newUnread[message.relationId] || 0) + 1
        return { ...old, unread: newUnread, total: old.total + 1 }
      })
    }

    const onTyping = ({ userId: typerId }: { userId: string }) => {
      if (!mounted) return
      setTypingUsers((prev) => new Set(prev).add(typerId))
    }

    const onStopTyping = ({ userId: typerId }: { userId: string }) => {
      if (!mounted) return
      setTypingUsers((prev) => {
        const next = new Set(prev)
        next.delete(typerId)
        return next
      })
    }

    const onRead = (_data: { userId: string; messageIds: string[] }) => {
      if (!mounted) return
      if (activeRelationId) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', activeRelationId] })
      }
    }

    // Delay for React 19 StrictMode
    const connectTimer = setTimeout(() => {
      if (!mounted) return

      // Connect to dedicated /chat namespace — fully independent from presence
      socket = io(presenceUrl + '/chat', {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        withCredentials: false,
      })

      socketRef.current = socket

      // Attach handlers
      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('chat:message', onMessage)
      socket.on('chat:typing', onTyping)
      socket.on('chat:stop-typing', onStopTyping)
      socket.on('chat:read', onRead)
    }, 150)

    return () => {
      mounted = false
      clearTimeout(connectTimer)
      if (socket) {
        if (socket.connected) {
          partners.forEach((p) => {
            socket!.emit('chat:leave', { relationId: p.relationId })
          })
        }
        socket.disconnect() // Safe — dedicated /chat namespace socket
      }
      socketRef.current = null
      setSocketConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, partners.length])

  // Перезаходим в комнату при смене активного чата
  useEffect(() => {
    const socket = socketRef.current
    if (!socket?.connected || !activeRelationId) return
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

    // Мгновенно обнуляем бейдж для этого чата (оптимистично)
    queryClient.setQueryData<UnreadResponse>(['chat', 'unread'], (old) => {
      if (!old) return old
      const count = old.unread[activeRelationId] || 0
      const newUnread = { ...old.unread }
      delete newUnread[activeRelationId]
      return { ...old, unread: newUnread, total: Math.max(0, old.total - count) }
    })

    markMessagesRead(activeRelationId, ids).then(() => {
      socketRef.current?.emit('chat:read' as any, {
        relationId: activeRelationId,
        userId,
        messageIds: ids,
      })
    })
  }, [activeRelationId, isOpen, messages, userId, queryClient])

  // ========================================================================
  // Optimistic send — instant for sender, socket relay to partner,
  // HTTP save in background
  // ========================================================================
  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeRelationId || !text.trim() || !userId) return
      const trimmed = text.trim()

      // 1. Create optimistic message for instant display
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const now = new Date().toISOString()
      const optimistic: ChatMessage = {
        id: tempId,
        relationId: activeRelationId,
        senderId: userId,
        text: trimmed,
        createdAt: now,
        editedAt: null,
        sender: { id: userId, name: userName, email: userEmail, image: userImage },
        reads: [],
      }

      // 2. Show in own chat immediately
      addMessageToCache(activeRelationId, optimistic)
      updateLastMessage(activeRelationId, optimistic)

      // 3. Relay to partner via socket IMMEDIATELY (before HTTP save)
      socketRef.current?.emit('chat:message' as any, {
        relationId: activeRelationId,
        message: optimistic,
      })
      socketRef.current?.emit('chat:stop-typing' as any, {
        relationId: activeRelationId,
        userId,
      })

      // 4. Save to DB in background, replace temp message with real one
      try {
        const saved = await sendChatMessage(activeRelationId, trimmed)
        replaceTempMessage(activeRelationId, tempId, saved)
      } catch (error) {
        console.error('Failed to save chat message:', error)
        // Message stays visible with temp ID — will sync on next fetch
      }
    },
    [activeRelationId, userId, userName, userEmail, userImage, addMessageToCache, updateLastMessage, replaceTempMessage],
  )

  const sendTyping = useCallback(() => {
    if (!activeRelationId || !userId) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now

    socketRef.current?.emit('chat:typing' as any, {
      relationId: activeRelationId,
      userId,
    })

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
    lastMessages,
    typingUsers,
    sendTyping,
    isOpen,
    setIsOpen,
  }
}
