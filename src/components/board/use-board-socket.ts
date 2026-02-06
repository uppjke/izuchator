'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import type {
  BoardElement,
  BoardClientToServerEvents,
  BoardServerToClientEvents,
} from './types'

interface BoardUser {
  userId: string
  userName: string
}

interface CursorPosition {
  x: number
  y: number
  userId: string
  userName: string
}

interface UseBoardSocketOptions {
  boardId: string
  onRemoteElement: (element: BoardElement) => void
  onRemoteErase: (ids: string[]) => void
  onRemoteClear: () => void
  onRemoteUndo: (elementId: string) => void
}

export function useBoardSocket({
  boardId,
  onRemoteElement,
  onRemoteErase,
  onRemoteClear,
  onRemoteUndo,
}: UseBoardSocketOptions) {
  const { data: session } = useSession()
  const socketRef = useRef<Socket<BoardServerToClientEvents, BoardClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [boardUsers, setBoardUsers] = useState<BoardUser[]>([])
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map())

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PRESENCE_SERVER
    if (!envUrl || !session?.user?.id) return

    // Derive URL from browser hostname (same as presence hook)
    let serverUrl = envUrl
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(envUrl)
        url.hostname = window.location.hostname
        serverUrl = url.origin
      } catch { /* fallback */ }
    }

    const socket: Socket<BoardServerToClientEvents, BoardClientToServerEvents> = io(
      `${serverUrl}/board`,
      {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    )

    socketRef.current = socket
    const currentUserId = session.user.id!

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('board:join', {
        boardId,
        userId: currentUserId,
      })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Remote drawing
    socket.on('board:draw', ({ element, userId }) => {
      if (userId !== currentUserId) {
        onRemoteElement(element)
      }
    })

    socket.on('board:erase', ({ elementIds, userId }) => {
      if (userId !== currentUserId) {
        onRemoteErase(elementIds)
      }
    })

    socket.on('board:clear', ({ userId }) => {
      if (userId !== currentUserId) {
        onRemoteClear()
      }
    })

    socket.on('board:undo', ({ elementId, userId }) => {
      if (userId !== currentUserId) {
        onRemoteUndo(elementId)
      }
    })

    socket.on('board:cursor', ({ x, y, userId, userName }) => {
      if (userId !== currentUserId) {
        setCursors(prev => {
          const next = new Map(prev)
          next.set(userId, { x, y, userId, userName })
          return next
        })
      }
    })

    socket.on('board:user-joined', ({ userId, userName }) => {
      setBoardUsers(prev => {
        if (prev.some(u => u.userId === userId)) return prev
        return [...prev, { userId, userName }]
      })
    })

    socket.on('board:user-left', ({ userId }) => {
      setBoardUsers(prev => prev.filter(u => u.userId !== userId))
      setCursors(prev => {
        const next = new Map(prev)
        next.delete(userId)
        return next
      })
    })

    socket.on('board:users', ({ users }) => {
      setBoardUsers(users)
    })

    return () => {
      socket.emit('board:leave', { boardId })
      socket.disconnect()
    }
  }, [boardId, session?.user?.id])

  // Emit drawing
  const emitDraw = useCallback((element: BoardElement) => {
    socketRef.current?.emit('board:draw', { boardId, element })
  }, [boardId])

  const emitErase = useCallback((elementIds: string[]) => {
    socketRef.current?.emit('board:erase', { boardId, elementIds })
  }, [boardId])

  const emitCursor = useCallback((x: number, y: number) => {
    if (!session?.user?.id) return
    socketRef.current?.emit('board:cursor', {
      boardId,
      x,
      y,
      userId: session.user.id,
    })
  }, [boardId, session?.user?.id])

  const emitClear = useCallback(() => {
    socketRef.current?.emit('board:clear', { boardId })
  }, [boardId])

  return {
    isConnected,
    boardUsers,
    cursors,
    emitDraw,
    emitErase,
    emitCursor,
    emitClear,
  }
}
