'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Save,
  Loader2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { useCanvas } from '@/components/board/board-canvas'
import { BoardToolbar, MobileToolbar } from '@/components/board/board-toolbar'
import { useBoardSocket } from '@/components/board/use-board-socket'
import type { BoardData, CanvasState } from '@/components/board/types'

export default function BoardPage() {
  const { id: boardId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id || ''

  const [board, setBoard] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showUsers, setShowUsers] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Socket — real-time collaboration
  const {
    isConnected,
    boardUsers,
    cursors,
    emitDraw,
    emitErase,
    emitCursor,
    emitClear,
  } = useBoardSocket({
    boardId,
    onRemoteElement: (element) => addRemoteElement(element),
    onRemoteErase: (ids) => removeRemoteElements(ids),
    onRemoteClear: () => clear(),
    onRemoteUndo: () => {}, // TODO: sync undo
  })

  // Canvas hook
  const {
    canvasRef,
    state,
    setState,
    elements,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    addRemoteElement,
    removeRemoteElements,
    render,
  } = useCanvas({
    initialElements: board?.elements || [],
    userId,
    onElementAdd: (element) => {
      emitDraw(element)
      scheduleAutoSave()
    },
    onElementsRemove: (ids) => {
      emitErase(ids)
      scheduleAutoSave()
    },
  })

  // Load board data
  useEffect(() => {
    if (!boardId) return

    async function loadBoard() {
      try {
        const res = await fetch(`/api/boards/${boardId}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('Доска не найдена')
          if (res.status === 403) throw new Error('Нет доступа к этой доске')
          throw new Error('Ошибка загрузки доски')
        }
        const data = await res.json()
        setBoard(data.board)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      } finally {
        setLoading(false)
      }
    }

    loadBoard()
  }, [boardId])

  // Resize canvas to fill container
  useEffect(() => {
    function resizeCanvas() {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)

      render()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [render])

  // Re-render when elements change
  useEffect(() => {
    render()
  }, [elements, render])

  // Track cursor for remote users
  const handlePointerMoveWithCursor = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerMove(e)

      // Send cursor position to remote users (throttled)
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      emitCursor(x, y)
    },
    [handlePointerMove, emitCursor, canvasRef]
  )

  // Auto-save
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveBoard()
    }, 3000) // 3 seconds after last edit
  }, [])

  const saveBoard = useCallback(async () => {
    if (!boardId || saving) return

    setSaving(true)
    try {
      // Save elements via batch API
      await fetch(`/api/boards/${boardId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements, replace: true }),
      })
      setLastSaved(new Date())
    } catch {
      console.error('Ошибка сохранения доски')
    } finally {
      setSaving(false)
    }
  }, [boardId, elements, saving])

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  const handleStateChange = useCallback(
    (updates: Partial<CanvasState>) => {
      setState((prev) => ({ ...prev, ...updates }))
    },
    [setState]
  )

  const handleClear = useCallback(() => {
    clear()
    emitClear()
    scheduleAutoSave()
  }, [clear, emitClear, scheduleAutoSave])

  // ========== Loading / Error states ==========

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent mx-auto mb-4" />
          <p className="text-zinc-600 text-sm">Загрузка доски...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-red-500 text-lg font-medium mb-2">{error}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <Icon icon={ArrowLeft} size="sm" />
            Назад
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-white overflow-hidden">
      {/* Header bar */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-white/95 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <Icon icon={ArrowLeft} size="sm" />
          </Button>
          <h1 className="text-sm font-medium text-zinc-900 truncate">
            {board?.title || 'Доска'}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Connection status */}
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Icon
              icon={isConnected ? Wifi : WifiOff}
              size="xs"
              className={isConnected ? 'text-green-500' : 'text-red-400'}
            />
          </div>

          {/* Online users */}
          {boardUsers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setShowUsers(!showUsers)}
            >
              <Icon icon={Users} size="xs" />
              {boardUsers.length}
            </Button>
          )}

          {/* Save indicator */}
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            {saving ? (
              <Icon icon={Loader2} size="xs" className="animate-spin" />
            ) : lastSaved ? (
              <Icon icon={Save} size="xs" />
            ) : null}
          </div>
        </div>
      </header>

      {/* Desktop toolbar */}
      <div className="hidden lg:block border-b border-zinc-100 shrink-0">
        <BoardToolbar
          state={state}
          onChange={handleStateChange}
          onUndo={undo}
          onRedo={redo}
          onClear={handleClear}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMoveWithCursor}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Remote cursors overlay */}
        {Array.from(cursors.values()).map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none z-10 transition-all duration-75"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            <div className="w-4 h-4 border-2 border-blue-500 rounded-full bg-blue-500/20" />
            <span className="absolute top-4 left-2 text-[10px] text-blue-600 font-medium whitespace-nowrap bg-white/80 px-1 rounded">
              {cursor.userName}
            </span>
          </div>
        ))}

        {/* Online users panel */}
        <AnimatePresence>
          {showUsers && boardUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-2 right-2 bg-white rounded-lg shadow-lg border border-zinc-200 p-3 z-20 min-w-[160px]"
            >
              <p className="text-xs font-medium text-zinc-500 mb-2">На доске:</p>
              {boardUsers.map((user) => (
                <div key={user.userId} className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-zinc-700">{user.userName}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile toolbar */}
      <div className="lg:hidden shrink-0">
        <MobileToolbar
          state={state}
          onChange={handleStateChange}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>
    </div>
  )
}
