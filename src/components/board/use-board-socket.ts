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
  onRemoteDrawProgress: (userId: string, element: BoardElement) => void
  onRemoteMoveProgress: (userId: string, elementIds: string[], dx: number, dy: number) => void
  onRemoteResizeDelta: (userId: string, elementIds: string[], handle: string, dx: number, dy: number, originalBounds: { x: number; y: number; w: number; h: number }) => void
  onRemoteErase: (ids: string[]) => void
  onRemoteSelect: (userId: string, elementIds: string[]) => void
  onRemoteClear: () => void
  onRemoteUndo: (elementId: string) => void
  onStateRequest?: () => BoardElement[]
  onSyncState?: (elements: BoardElement[]) => void
}

const CURSOR_THROTTLE_MS = 50

export function useBoardSocket({
  boardId,
  onRemoteElement,
  onRemoteDrawProgress,
  onRemoteMoveProgress,
  onRemoteResizeDelta,
  onRemoteErase,
  onRemoteSelect,
  onRemoteClear,
  onRemoteUndo,
  onStateRequest,
  onSyncState,
}: UseBoardSocketOptions) {
  const { data: session } = useSession()
  const socketRef = useRef<Socket<BoardServerToClientEvents, BoardClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [boardUsers, setBoardUsers] = useState<BoardUser[]>([])
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map())

  // Cursor throttle ref
  const lastCursorEmitRef = useRef(0)

  // Store callbacks in refs to avoid re-triggering the effect
  const callbacksRef = useRef({ onRemoteElement, onRemoteDrawProgress, onRemoteMoveProgress, onRemoteResizeDelta, onRemoteErase, onRemoteSelect, onRemoteClear, onRemoteUndo, onStateRequest, onSyncState })
  callbacksRef.current = { onRemoteElement, onRemoteDrawProgress, onRemoteMoveProgress, onRemoteResizeDelta, onRemoteErase, onRemoteSelect, onRemoteClear, onRemoteUndo, onStateRequest, onSyncState }

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PRESENCE_SERVER
    if (!envUrl || !session?.user?.id || !boardId) return

    let mounted = true
    let socket: Socket<BoardServerToClientEvents, BoardClientToServerEvents> | null = null

    // Connect immediately — no delay
    const setup = () => {
      if (!mounted) return

      let serverUrl = envUrl
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(envUrl)
          url.hostname = window.location.hostname
          serverUrl = url.origin
        } catch { /* fallback */ }
      }

      socket = io(
        `${serverUrl}/board`,
        {
          transports: ['websocket'],
          upgrade: false,
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        }
      )

      socketRef.current = socket
      const currentUserId = session.user!.id!
      const currentUserName = session.user!.name || session.user!.email?.split('@')[0] || 'Аноним'

      socket.on('connect', () => {
        if (!mounted) return
        setIsConnected(true)
        socket!.emit('board:join', {
          boardId,
          userId: currentUserId,
          userName: currentUserName,
        })
      })

      socket.on('disconnect', () => {
        if (!mounted) return
        setIsConnected(false)
      })

      // Main draw handler — handles both final elements and in-progress (via _transient flag)
      socket.on('board:draw', ({ element, userId }) => {
        if (userId !== currentUserId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isTransient = (element as any)?._transient === true
          if (isTransient) {
            // In-progress drawing from another user — show as ephemeral
            // Strip the _transient flag before rendering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clean = { ...element } as any
            delete clean._transient
            callbacksRef.current.onRemoteDrawProgress(userId, clean as BoardElement)
          } else {
            // Final committed element
            callbacksRef.current.onRemoteElement(element)
          }
        }
      })

      // Also listen for board:draw-progress in case server supports it
      socket.on('board:draw-progress', ({ element, userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteDrawProgress(userId, element)
        }
      })

      socket.on('board:erase', ({ elementIds, userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteErase(elementIds)
        }
      })

      // Remote selection outlines
      socket.on('board:select', ({ elementIds, userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteSelect(userId, elementIds)
        }
      })

      // Batch move progress — multiple elements in one message (legacy)
      socket.on('board:move-batch', ({ elements, userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteMoveProgress(userId, elements.map(e => (e as BoardElement).id), 0, 0)
        }
      })

      // Delta-based move progress — lightweight, just IDs + offset
      socket.on('board:move-delta', ({ elementIds, dx, dy, userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteMoveProgress(userId, elementIds, dx, dy)
        }
      })

      // Delta-based resize progress — IDs + handle + offset + original bounds
      socket.on('board:resize-delta', ({ elementIds, handle, dx, dy, originalBounds, userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteResizeDelta(userId, elementIds, handle, dx, dy, originalBounds)
        }
      })

      socket.on('board:clear', ({ userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteClear()
        }
      })

      socket.on('board:undo', ({ elementId, userId }) => {
        if (userId !== currentUserId) {
          callbacksRef.current.onRemoteUndo(elementId)
        }
      })

      socket.on('board:cursor', ({ x, y, userId, userName }) => {
        if (!mounted || userId === currentUserId) return
        setCursors(prev => {
          const next = new Map(prev)
          next.set(userId, { x, y, userId, userName })
          return next
        })
      })

      socket.on('board:user-joined', ({ userId, userName }) => {
        if (!mounted) return
        setBoardUsers(prev => {
          if (prev.some(u => u.userId === userId)) return prev
          return [...prev, { userId, userName }]
        })
      })

      socket.on('board:user-left', ({ userId }) => {
        if (!mounted) return
        setBoardUsers(prev => prev.filter(u => u.userId !== userId))
        setCursors(prev => {
          const next = new Map(prev)
          next.delete(userId)
          return next
        })
        // Clear remote user's selection when they leave
        callbacksRef.current.onRemoteSelect(userId, [])
      })

      socket.on('board:users', ({ users }) => {
        if (!mounted) return
        setBoardUsers(users)
      })

      // State sync: respond with current elements when a new user joins
      socket.on('board:request-state', ({ requesterId }) => {
        const elements = callbacksRef.current.onStateRequest?.()
        if (elements && elements.length > 0) {
          socket!.emit('board:state-response', { boardId, requesterId, elements })
        }
      })

      // State sync: receive full element state from an existing peer
      socket.on('board:sync-state', ({ elements }) => {
        if (!mounted) return
        callbacksRef.current.onSyncState?.(elements as BoardElement[])
      })
    }

    setup()

    return () => {
      mounted = false
      if (socket) {
        socket.emit('board:leave', { boardId })
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [boardId, session?.user?.id, session?.user?.name, session?.user?.email])

  const emitDraw = useCallback((element: BoardElement) => {
    socketRef.current?.emit('board:draw', { boardId, element })
  }, [boardId])

  // Emit in-progress drawing via board:draw with _transient flag
  // This piggybacks on the existing server relay — no new server event needed
  const emitDrawProgress = useCallback((element: BoardElement) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transientElement = { ...element, _transient: true } as any
    socketRef.current?.emit('board:draw', { boardId, element: transientElement })
  }, [boardId])

  const emitErase = useCallback((elementIds: string[]) => {
    socketRef.current?.emit('board:erase', { boardId, elementIds })
  }, [boardId])

  // Throttled cursor emission
  const emitCursor = useCallback((x: number, y: number) => {
    if (!session?.user?.id) return
    const now = Date.now()
    if (now - lastCursorEmitRef.current < CURSOR_THROTTLE_MS) return
    lastCursorEmitRef.current = now
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

  // Emit batched move progress — all moved elements in one message
  const emitMoveBatch = useCallback((elements: BoardElement[]) => {
    socketRef.current?.emit('board:move-batch', { boardId, elements })
  }, [boardId])

  // Emit lightweight move delta — just IDs + offset
  const emitMoveDelta = useCallback((elementIds: string[], dx: number, dy: number) => {
    socketRef.current?.emit('board:move-delta', { boardId, elementIds, dx, dy })
  }, [boardId])

  // Emit lightweight resize delta — IDs + handle + offset + original bounds
  const emitResizeDelta = useCallback((elementIds: string[], handle: string, dx: number, dy: number, originalBounds: { x: number; y: number; w: number; h: number }) => {
    socketRef.current?.emit('board:resize-delta', { boardId, elementIds, handle, dx, dy, originalBounds })
  }, [boardId])

  // Emit selection state to remote users
  const emitSelect = useCallback((elementIds: string[]) => {
    socketRef.current?.emit('board:select', { boardId, elementIds })
  }, [boardId])

  return {
    isConnected,
    boardUsers,
    cursors,
    emitDraw,
    emitDrawProgress,
    emitErase,
    emitCursor,
    emitClear,
    emitMoveBatch,
    emitMoveDelta,
    emitResizeDelta,
    emitSelect,
  }
}
