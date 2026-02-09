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
  Check,
  Trash2,
  Copy,
  Video,
  VideoOff,
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
import { useVideoCall } from '@/components/board/use-video-call'
import { VideoPanel } from '@/components/board/video-panel'
import { useTeacherStudents } from '@/hooks/use-relations'
import { updateBoard } from '@/lib/api'
import { ChatProvider } from '@/lib/chat-context'
import { ChatButton } from '@/components/chat/chat-button'
import { ChatSheet } from '@/components/chat/chat-sheet'
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

  // Toolbar position — lifted so VideoPanel can anchor opposite
  const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('bottom')

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
    connectionError,
    boardUsers,
    cursors,
    socketRef,
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

  // Video call
  const {
    localStream,
    remoteStreams,
    isActive: isVideoActive,
    isMuted,
    isCameraOff,
    mediaSupported,
    toggleMedia,
    toggleMute,
    toggleCamera,
  } = useVideoCall({
    boardId,
    userId,
    socketRef,
    boardUsers,
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
    handlePointerCancel,
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
    renderSync,
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

  // Prevent text selection on the entire page during touch/stylus interaction
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener('selectstart', prevent)
    document.addEventListener('dragstart', prevent)
    return () => {
      document.removeEventListener('selectstart', prevent)
      document.removeEventListener('dragstart', prevent)
    }
  }, [])

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

      renderSync()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [renderSync, loading])

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

  // Document-level pointer event listeners in CAPTURE phase.
  // iPadOS can suppress pen pointerdown events at the element level for rapid
  // Apple Pencil strokes (gesture recognition delay).  Capture-phase document
  // listeners receive events before any element-level processing or suppression.
  const pointerHandlersRef = useRef({ handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, emitCursor, screenToWorld })
  pointerHandlersRef.current = { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, emitCursor, screenToWorld }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Only handle events that target the canvas element itself (not overlays like video panel, context menu, etc.)
    const isInCanvas = (e: PointerEvent): boolean => {
      const target = e.target as HTMLElement | null
      const canvas = canvasRef.current
      // Only process events on the canvas element itself
      if (!canvas || target !== canvas) return false
      return true
    }

    const emitWorldCursor = (e: PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const [wx, wy] = pointerHandlersRef.current.screenToWorld(sx, sy)
      pointerHandlersRef.current.emitCursor(wx, wy)
    }

    const onDown = (e: PointerEvent) => {
      if (!isInCanvas(e)) return
      pointerHandlersRef.current.handlePointerDown(e)
    }
    const onMove = (e: PointerEvent) => {
      if (!isInCanvas(e)) return
      pointerHandlersRef.current.handlePointerMove(e)
      emitWorldCursor(e)
    }
    const onUp = (e: PointerEvent) => {
      // Always handle up (pointer may have moved outside canvas during stroke)
      pointerHandlersRef.current.handlePointerUp(e)
    }
    const onCancel = (e: PointerEvent) => {
      pointerHandlersRef.current.handlePointerCancel(e)
    }

    // Capture phase = earliest possible interception, before bubble phase
    const captureOpts: AddEventListenerOptions = { passive: false, capture: true }
    document.addEventListener('pointerdown', onDown, captureOpts)
    document.addEventListener('pointermove', onMove, captureOpts)
    document.addEventListener('pointerup', onUp, captureOpts)
    document.addEventListener('pointercancel', onCancel, captureOpts)

    // === CRITICAL: Block touch events to disable iPadOS Scribble ===
    // Scribble intercepts Apple Pencil touch events at the OS level and
    // completely swallows them before they become pointer events.
    // preventDefault() on touchstart is the ONLY way to disable it.
    // Only block touches that start on the canvas itself (not overlays like video panel).
    const preventTouch = (e: TouchEvent) => {
      if (e.target === canvasRef.current) e.preventDefault()
    }
    container.addEventListener('touchstart', preventTouch, { passive: false })
    container.addEventListener('touchmove', preventTouch, { passive: false })
    container.addEventListener('touchend', preventTouch, { passive: false })
    // Also on document capture phase for belt-and-suspenders
    document.addEventListener('touchstart', (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch && (touch.target as HTMLElement) === canvasRef.current) e.preventDefault()
    }, { passive: false, capture: true })

    return () => {
      document.removeEventListener('pointerdown', onDown, { capture: true })
      document.removeEventListener('pointermove', onMove, { capture: true })
      document.removeEventListener('pointerup', onUp, { capture: true })
      document.removeEventListener('pointercancel', onCancel, { capture: true })
      container.removeEventListener('touchstart', preventTouch)
      container.removeEventListener('touchmove', preventTouch)
      container.removeEventListener('touchend', preventTouch)
    }
  }, [loading]) // re-attach when canvas mounts after loading

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
    <ChatProvider>
    <div className="flex flex-col h-dvh bg-white overflow-hidden select-none" style={{ WebkitUserSelect: 'none', touchAction: 'manipulation' }}>
      {/* Compact header */}
      <header className="flex items-center justify-between px-3 py-2 md:px-5 md:py-3 border-b border-zinc-200/50 bg-white/95 backdrop-blur-sm z-30 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 h-8 w-8 md:h-10 md:w-10"
          >
            <Icon icon={ArrowLeft} size="sm" className="md:!h-5 md:!w-5" />
          </Button>

          {/* Inline title editing */}
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="h-7 md:h-9 text-sm md:text-base font-medium w-48 max-w-[50vw]"
              autoFocus
            />
          ) : (
            <h1
              className={`text-sm md:text-base font-medium text-zinc-900 truncate ${isTeacher ? 'cursor-pointer hover:text-zinc-600 transition-colors' : ''}`}
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
                    <button className="flex items-center gap-1 text-xs md:text-sm text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 md:px-3 md:py-1 hover:bg-zinc-200 transition-colors shrink-0">
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
                      className="h-7 md:h-9 text-xs md:text-sm gap-1 text-zinc-400 hover:text-zinc-600 shrink-0"
                    >
                      <Icon icon={UserPlus} size="xs" />
                      <span className="hidden sm:inline">Пригласить</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <p className="text-xs font-medium text-zinc-500 mb-2">Пригласить ученика</p>
                    {students.length > 0 ? (
                      <Select defaultValue="" onValueChange={handleAssignStudent}>
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

        <div className="flex items-center gap-1.5 md:gap-2.5">
          {/* Connection status */}
          <div className="flex items-center gap-1 text-xs md:text-sm text-zinc-500" title={connectionError || undefined}>
            <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400 animate-pulse'}`} />
          </div>

          {/* Online users */}
          {boardUsers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs md:text-sm gap-1 h-7 md:h-9"
              onClick={() => setShowUsers(!showUsers)}
            >
              <Icon icon={Users} size="xs" className="md:!h-4 md:!w-4" />
              {boardUsers.length}
            </Button>
          )}

          {/* Camera toggle */}
          {mediaSupported && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 md:h-9 md:w-9 p-0 ${
                isVideoActive ? 'text-green-500 hover:text-green-600' : 'text-zinc-400 hover:text-zinc-600'
              }`}
              onClick={toggleMedia}
              title={isVideoActive ? 'Выключить камеру' : 'Включить камеру'}
            >
              <Icon icon={isVideoActive ? Video : VideoOff} size="xs" className="md:!h-4 md:!w-4" />
            </Button>
          )}

          {/* Chat */}
          <ChatButton size="sm" />

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

      {/* Connection error banner */}
      <AnimatePresence>
        {!isConnected && connectionError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-amber-50 border-b border-amber-200 overflow-hidden"
          >
            <div className="px-3 py-2 flex items-center gap-2 text-xs text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <span className="flex-1">
                {connectionError === 'cert'
                  ? 'Не удалось подключиться — откройте в браузере '
                  : 'Подключение к серверу...'}
                {connectionError === 'cert' && (
                  <a
                    href={`${(() => { try { const u = new URL(process.env.NEXT_PUBLIC_PRESENCE_SERVER || ''); u.hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'; return u.origin } catch { return '' } })()}/health`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    сервер и примите сертификат
                  </a>
                )}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas area — full remaining space */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ touchAction: 'none', cursor: cursorStyle, WebkitUserSelect: 'none' }}
        />

        {/* Video panel */}
        <VideoPanel
          localStream={localStream}
          remoteStreams={remoteStreams}
          isActive={isVideoActive}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          boardUsers={boardUsers}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          toolbarPosition={toolbarPosition}
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
              <div className="flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-zinc-200 p-1 md:p-1.5">
                <button
                  onClick={handleDuplicateSelected}
                  className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                  title="Дублировать (⌘D)"
                >
                  <Icon icon={Copy} size="sm" className="md:!h-5 md:!w-5" />
                </button>
                <div className="w-px h-4 md:h-5 bg-zinc-200" />
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Удалить (Delete)"
                >
                  <Icon icon={Trash2} size="sm" className="md:!h-5 md:!w-5" />
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
              className="absolute top-2 right-2 md:top-3 md:right-3 bg-white rounded-lg shadow-lg border border-zinc-200 p-3 md:p-4 z-20 min-w-[160px] md:min-w-[200px]"
            >
              <p className="text-xs md:text-sm font-medium text-zinc-500 mb-2">На доске:</p>
              {boardUsers.map((user) => (
                <div key={user.userId} className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm md:text-base text-zinc-700">{user.userName}</span>
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
        toolbarPosition={toolbarPosition}
        onPositionChange={setToolbarPosition}
      />
      <ChatSheet />
    </div>
    </ChatProvider>
  )
}
