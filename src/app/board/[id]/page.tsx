'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Loader2,
  Users,
  UserPlus,
  Wifi,
  WifiOff,
  Check,
  Trash2,
  Copy,
} from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCanvas } from '@/components/board/board-canvas'
import { FloatingToolbar } from '@/components/board/board-toolbar'
import { useBoardSocket } from '@/components/board/use-board-socket'
import { useTeacherStudents } from '@/hooks/use-relations'
import { updateBoard } from '@/lib/api'
import type { BoardData, CanvasState } from '@/components/board/types'

export default function BoardPage() {
  const { id: boardId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id || ''

  const [board, setBoard] = useState<BoardData | null>(null)
  const [boardRole, setBoardRole] = useState<'teacher' | 'student'>('student')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showUsers, setShowUsers] = useState(false)
  const isNavigatingRef = useRef(false)

  // Inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Student invite popover
  const [showStudentPicker, setShowStudentPicker] = useState(false)

  const isTeacher = boardRole === 'teacher'

  // Fetch teacher's students for the student picker
  const { data: students = [] } = useTeacherStudents(isTeacher ? userId : undefined)

  const containerRef = useRef<HTMLDivElement>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const viewportRestoredRef = useRef(false)
  const isDirtyRef = useRef(false)

  // Socket — real-time collaboration
  const {
    isConnected,
    boardUsers,
    cursors,
    emitDraw,
    emitDrawProgress,
    emitErase,
    emitCursor,
    emitClear,
    emitMoveDelta,
    emitResizeDelta,
    emitSelect,
  } = useBoardSocket({
    boardId,
    onRemoteElement: (element) => addRemoteElement(element),
    onRemoteDrawProgress: (uid, element) => setRemoteDrawing(uid, element),
    onRemoteMoveProgress: (uid, ids, dx, dy) => setRemoteMoveDelta(uid, ids, dx, dy),
    onRemoteResizeDelta: (uid, ids, handle, dx, dy, ob) => setRemoteResizeDelta(uid, ids, handle, dx, dy, ob),
    onRemoteErase: (ids) => removeRemoteElements(ids),
    onRemoteSelect: (uid, ids) => setRemoteSelection(uid, ids),
    onRemoteClear: () => clear(),
    onRemoteUndo: () => {},
    onStateRequest: () => getElements(),
    onSyncState: (elements) => {
      // Peer has more up-to-date state than DB — replace elements
      loadElements(elements)
    },
  })

  // Canvas hook — callbacks are stored in refs internally, so inline functions are fine
  const {
    canvasRef,
    state,
    setState,
    viewport,
    setViewport,
    elements,
    loadElements,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    selectedIds: _selectedIds,
    selectionCursor,
    deleteSelected,
    duplicateSelected,
    getSelectionScreenBounds,
    addRemoteElement,
    updateRemoteElement: _updateRemoteElement,
    removeRemoteElements,
    setRemoteDrawing,
    setRemoteMoveDelta,
    setRemoteResizeDelta,
    setRemoteSelection,
    clearRemoteDrawing: _clearRemoteDrawing,
    render,
    zoomIn,
    zoomOut,
    zoomReset,
    screenToWorld,
    generateThumbnail,
    getElements,
  } = useCanvas({
    userId,
    onElementAdd: (element) => {
      emitDraw(element)
      isDirtyRef.current = true
      scheduleAutoSave()
    },
    onElementsRemove: (ids) => {
      emitErase(ids)
      isDirtyRef.current = true
      scheduleAutoSave()
    },
    onDrawProgress: (element) => {
      emitDrawProgress(element)
    },
    onElementUpdate: (element) => {
      emitDraw(element)
      isDirtyRef.current = true
      scheduleAutoSave()
    },
    onMoveDelta: (ids, dx, dy) => {
      emitMoveDelta(ids, dx, dy)
    },
    onResizeDelta: (ids, handle, dx, dy, originalBounds) => {
      emitResizeDelta(ids, handle, dx, dy, originalBounds)
    },
    onSelectionChange: (ids) => {
      emitSelect(ids)
    },
  })

  // Load board data + restore viewport
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
        setBoardRole(data.role || 'student')
        if (data.board.elements?.length > 0) {
          loadElements(data.board.elements)
        }
        // Restore saved viewport position (or flag for centering after canvas mount)
        try {
          const savedVp = localStorage.getItem(`board-viewport-${boardId}`)
          if (savedVp) {
            const vp = JSON.parse(savedVp)
            if (typeof vp.offsetX === 'number' && typeof vp.offsetY === 'number' && typeof vp.scale === 'number') {
              // Skip stale {0,0,1} viewports saved before centering was implemented
              const isStaleDefault = vp.offsetX === 0 && vp.offsetY === 0 && vp.scale === 1
              if (!isStaleDefault) {
                setViewport(vp)
                viewportRestoredRef.current = true
              }
            }
          }
        } catch { /* ignore parse errors */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      } finally {
        setLoading(false)
      }
    }

    loadBoard()
  }, [boardId, loadElements, setViewport])

  // Persist viewport to localStorage on changes (skip until properly centered)
  useEffect(() => {
    if (!boardId || loading) return
    // Don't persist the default {0,0,1} before centering kicks in
    if (!viewportRestoredRef.current && viewport.offsetX === 0 && viewport.offsetY === 0) return
    try {
      localStorage.setItem(`board-viewport-${boardId}`, JSON.stringify(viewport))
    } catch { /* ignore quota errors */ }
  }, [boardId, viewport, loading])

  // Resize canvas to fill container
  // NB: depends on `loading` so the effect re-fires when canvas mounts after loading
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
  }, [render, loading])

  // Center viewport on first open (no saved viewport)
  useEffect(() => {
    if (loading || viewportRestoredRef.current) return
    // Canvas is now mounted — center the world origin on screen
    zoomReset()
    viewportRestoredRef.current = true
  }, [loading, zoomReset])

  useEffect(() => {
    render()
  }, [elements, render])

  // Track cursor for remote users — send WORLD coordinates
  const handlePointerMoveWithCursor = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerMove(e)

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      // Convert screen → world so cursors align regardless of each user's viewport
      const [wx, wy] = screenToWorld(sx, sy)
      emitCursor(wx, wy)
    },
    [handlePointerMove, emitCursor, canvasRef, screenToWorld]
  )

  // Auto-save
  const saveBoardRef = useRef<(() => Promise<void>) | undefined>(undefined)

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveBoardRef.current?.()
    }, 3000)
  }, [])

  const saveBoard = useCallback(async () => {
    if (!boardId || savingRef.current || !isDirtyRef.current) return

    savingRef.current = true
    setSaving(true)
    try {
      // Use getElements() for always-fresh data (avoids stale closure)
      const currentElements = getElements()
      // Save elements
      await fetch(`/api/boards/${boardId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: currentElements, replace: true }),
      })

      // Generate and save thumbnail preview
      const thumbnail = generateThumbnail()
      if (thumbnail) {
        await fetch(`/api/boards/${boardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thumbnail }),
        })
      }

      isDirtyRef.current = false
      setLastSaved(new Date())
    } catch {
      console.error('Ошибка сохранения доски')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [boardId, getElements, generateThumbnail])

  useEffect(() => {
    saveBoardRef.current = saveBoard
  }, [saveBoard])

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        // Flush pending save on unmount
        saveBoardRef.current?.()
      }
    }
  }, [])

  // Navigate back — save in background, navigate immediately
  const handleBack = useCallback(() => {
    if (isNavigatingRef.current) return
    isNavigatingRef.current = true
    // Cancel pending autosave timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    // Fire-and-forget save — don't block navigation
    saveBoardRef.current?.().catch(() => {})
    router.push('/dashboard')
  }, [router])

  const handleStateChange = useCallback(
    (updates: Partial<CanvasState>) => {
      setState((prev) => ({ ...prev, ...updates }))
    },
    [setState]
  )

  // Inline title editing
  const handleTitleClick = useCallback(() => {
    if (!isTeacher) return
    setEditTitle(board?.title || '')
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }, [isTeacher, board?.title])

  const handleTitleSave = useCallback(async () => {
    const newTitle = editTitle.trim() || 'Без названия'
    setIsEditingTitle(false)
    if (!boardId || newTitle === board?.title) return
    setBoard(prev => prev ? { ...prev, title: newTitle } : prev)
    try {
      await updateBoard(boardId, { title: newTitle })
    } catch {
      // Revert on error
      setBoard(prev => prev ? { ...prev, title: board?.title || '' } : prev)
    }
  }, [boardId, editTitle, board?.title])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') setIsEditingTitle(false)
  }, [handleTitleSave])

  // Student assignment
  const handleAssignStudent = useCallback(async (relationId: string) => {
    if (!boardId) return
    const actualRelationId = relationId === 'none' ? null : relationId
    setShowStudentPicker(false)
    try {
      const result = await updateBoard(boardId, { relationId: actualRelationId })
      setBoard(prev => prev ? { ...prev, relationId: actualRelationId, relation: result.board.relation } : prev)
    } catch {
      console.error('Ошибка привязки ученика')
    }
  }, [boardId])

  const handleClear = useCallback(() => {
    clear()
    emitClear()
    scheduleAutoSave()
  }, [clear, emitClear, scheduleAutoSave])

  // Cursor style based on tool
  const cursorStyle = state.tool === 'select'
    ? selectionCursor
    : state.tool === 'pan' ? 'grab'
    : state.tool === 'eraser' ? 'cell'
    : 'crosshair'

  // Selection context menu position
  const selectionBounds = getSelectionScreenBounds()
  const showContextMenu = _selectedIds.length > 0 && state.tool === 'select' && selectionBounds !== null

  // Smart context menu positioning: avoid overlapping handles, stay within canvas
  const contextMenuPos = useMemo(() => {
    if (!selectionBounds) return { left: 0, top: 0 }
    const MENU_W = 88   // approximate menu width (2 buttons + separator + padding)
    const MENU_H = 40   // approximate menu height
    const HANDLE_OVERSHOOT = 6 // handles extend ~4px beyond bounds, add margin
    const GAP = 8        // visual gap between handle and menu edge
    const EDGE_PAD = 8   // padding from canvas edges

    const container = containerRef.current
    const containerW = container?.clientWidth ?? window.innerWidth

    // Horizontal: centered on selection, clamped to canvas bounds
    let left = selectionBounds.x + selectionBounds.w / 2 - MENU_W / 2
    left = Math.max(EDGE_PAD, Math.min(left, containerW - MENU_W - EDGE_PAD))

    // Vertical: prefer above; if no room, go below
    const aboveTop = selectionBounds.y - HANDLE_OVERSHOOT - GAP - MENU_H
    const belowTop = selectionBounds.y + selectionBounds.h + HANDLE_OVERSHOOT + GAP

    const top = aboveTop >= EDGE_PAD ? aboveTop : belowTop

    return { left, top }
  }, [selectionBounds])

  const handleDeleteSelected = useCallback(() => {
    deleteSelected()
    isDirtyRef.current = true
    scheduleAutoSave()
  }, [deleteSelected, scheduleAutoSave])

  const handleDuplicateSelected = useCallback(() => {
    duplicateSelected()
    isDirtyRef.current = true
    scheduleAutoSave()
  }, [duplicateSelected, scheduleAutoSave])

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
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <Icon icon={ArrowLeft} size="sm" />
            Назад
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-white overflow-hidden">
      {/* Compact header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-zinc-200/50 bg-white/95 backdrop-blur-sm z-30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 h-8 w-8"
          >
            <Icon icon={ArrowLeft} size="sm" />
          </Button>

          {/* Inline title editing */}
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="h-7 text-sm font-medium w-48 max-w-[50vw]"
              autoFocus
            />
          ) : (
            <h1
              className={`text-sm font-medium text-zinc-900 truncate ${isTeacher ? 'cursor-pointer hover:text-zinc-600 transition-colors' : ''}`}
              onClick={handleTitleClick}
              title={isTeacher ? 'Нажмите для редактирования' : undefined}
            >
              {board?.title || 'Доска'}
            </h1>
          )}

          {/* Assigned student badge / invite */}
          {isTeacher && (
            <>
              {board?.relation?.student ? (
                <Popover open={showStudentPicker} onOpenChange={setShowStudentPicker}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 hover:bg-zinc-200 transition-colors shrink-0">
                      <Icon icon={Users} size="xs" />
                      <span className="truncate max-w-[100px]">
                        {board.relation.student.name || board.relation.student.email}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <p className="text-xs font-medium text-zinc-500 mb-2">Ученик на доске</p>
                    <Select
                      value={board.relationId || 'none'}
                      onValueChange={handleAssignStudent}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Убрать ученика</SelectItem>
                        {students.map((rel: { id: string; student: { id: string; name: string | null; email: string } }) => (
                          <SelectItem key={rel.id} value={rel.id}>
                            {rel.student.name || rel.student.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover open={showStudentPicker} onOpenChange={setShowStudentPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-zinc-400 hover:text-zinc-600 shrink-0"
                    >
                      <Icon icon={UserPlus} size="xs" />
                      <span className="hidden sm:inline">Пригласить</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <p className="text-xs font-medium text-zinc-500 mb-2">Пригласить ученика</p>
                    {students.length > 0 ? (
                      <Select onValueChange={handleAssignStudent}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Выберите ученика" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((rel: { id: string; student: { id: string; name: string | null; email: string } }) => (
                            <SelectItem key={rel.id} value={rel.id}>
                              {rel.student.name || rel.student.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        Нет учеников. Добавьте ученика через раздел &laquo;Ученики&raquo;.
                      </p>
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </>
          )}
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
              className="text-xs gap-1 h-7"
              onClick={() => setShowUsers(!showUsers)}
            >
              <Icon icon={Users} size="xs" />
              {boardUsers.length}
            </Button>
          )}

          {/* Autosave indicator */}
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            {saving ? (
              <Icon icon={Loader2} size="xs" className="animate-spin" />
            ) : lastSaved ? (
              <Icon icon={Check} size="xs" className="text-green-500" />
            ) : null}
          </div>
        </div>
      </header>

      {/* Canvas area — full remaining space */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ touchAction: 'none', cursor: cursorStyle }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMoveWithCursor}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Selection context menu */}
        <AnimatePresence>
          {showContextMenu && selectionBounds && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 pointer-events-auto"
              style={{
                left: contextMenuPos.left,
                top: contextMenuPos.top,
              }}
            >
              <div className="flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-zinc-200 p-1">
                <button
                  onClick={handleDuplicateSelected}
                  className="flex items-center justify-center w-8 h-8 text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                  title="Дублировать (⌘D)"
                >
                  <Icon icon={Copy} size="sm" />
                </button>
                <div className="w-px h-4 bg-zinc-200" />
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Удалить (Delete)"
                >
                  <Icon icon={Trash2} size="sm" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remote cursors overlay — convert world coords to screen */}
        {Array.from(cursors.values()).map((cursor) => {
          const screenX = cursor.x * viewport.scale + viewport.offsetX
          const screenY = cursor.y * viewport.scale + viewport.offsetY
          return (
            <div
              key={cursor.userId}
              className="absolute pointer-events-none z-10 transition-all duration-75"
              style={{
                left: screenX,
                top: screenY,
                transform: 'translate(-2px, -2px)',
              }}
            >
              <div className="w-4 h-4 border-2 border-blue-500 rounded-full bg-blue-500/20" />
              <span className="absolute top-4 left-2 text-[10px] text-blue-600 font-medium whitespace-nowrap bg-white/80 px-1 rounded">
                {cursor.userName}
              </span>
            </div>
          )
        })}

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

      {/* Floating toolbar — unified for all screen sizes */}
      <FloatingToolbar
        state={state}
        onChange={handleStateChange}
        onUndo={undo}
        onRedo={redo}
        onClear={handleClear}
        canUndo={canUndo}
        canRedo={canRedo}
        scale={viewport.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
      />
    </div>
  )
}
