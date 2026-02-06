'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { nanoid } from 'nanoid'
import type {
  BoardElement,
  BoardTool,
  CanvasState,
  PenElement,
  RectElement,
  CircleElement,
  LineElement,
  StrokeStyle,
} from './types'
import { DEFAULT_CANVAS_STATE, HIGHLIGHT_DEFAULTS } from './types'

// ============================================================================
// Утилиты рендеринга
// ============================================================================

function getStrokeStyle(state: CanvasState): StrokeStyle {
  if (state.tool === 'highlight') {
    return {
      color: HIGHLIGHT_DEFAULTS.color,
      width: HIGHLIGHT_DEFAULTS.width,
      opacity: HIGHLIGHT_DEFAULTS.opacity,
    }
  }
  return {
    color: state.strokeColor,
    width: state.strokeWidth,
    opacity: state.opacity,
  }
}

function drawElement(ctx: CanvasRenderingContext2D, element: BoardElement) {
  ctx.save()

  switch (element.type) {
    case 'pen':
    case 'highlight': {
      const { points, style } = element.data
      if (points.length < 2) break
      ctx.globalAlpha = style.opacity
      ctx.strokeStyle = style.color
      ctx.lineWidth = style.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(points[0]![0], points[0]![1])

      // Smooth curve through points (quadratic bezier)
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i]![0] + points[i + 1]![0]) / 2
        const yc = (points[i]![1] + points[i + 1]![1]) / 2
        ctx.quadraticCurveTo(points[i]![0], points[i]![1], xc, yc)
      }

      // Last segment
      const last = points[points.length - 1]!
      ctx.lineTo(last[0], last[1])
      ctx.stroke()
      break
    }

    case 'rect': {
      const { x, y, width, height, style, fill } = element.data
      ctx.globalAlpha = style.opacity
      if (fill) {
        ctx.fillStyle = fill
        ctx.fillRect(x, y, width, height)
      }
      ctx.strokeStyle = style.color
      ctx.lineWidth = style.width
      ctx.strokeRect(x, y, width, height)
      break
    }

    case 'circle': {
      const { cx, cy, rx, ry, style, fill } = element.data
      ctx.globalAlpha = style.opacity
      ctx.beginPath()
      ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
      if (fill) {
        ctx.fillStyle = fill
        ctx.fill()
      }
      ctx.strokeStyle = style.color
      ctx.lineWidth = style.width
      ctx.stroke()
      break
    }

    case 'line': {
      const { x1, y1, x2, y2, style } = element.data
      ctx.globalAlpha = style.opacity
      ctx.strokeStyle = style.color
      ctx.lineWidth = style.width
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      break
    }

    case 'text': {
      const d = element.data
      ctx.globalAlpha = 1
      ctx.fillStyle = d.color
      ctx.font = `${d.italic ? 'italic ' : ''}${d.bold ? 'bold ' : ''}${d.fontSize}px ${d.fontFamily}`
      ctx.textBaseline = 'top'

      // Разбиваем текст по строкам
      const lines = d.content.split('\n')
      lines.forEach((line, i) => {
        ctx.fillText(line, d.x, d.y + i * d.fontSize * 1.3)
      })
      break
    }

    case 'image': {
      // Изображения рендерятся отдельно через Image загрузку
      break
    }
  }

  ctx.restore()
}

// Проверка попадания точки в элемент (для ластика)
function hitTest(element: BoardElement, x: number, y: number, threshold: number = 10): boolean {
  switch (element.type) {
    case 'pen':
    case 'highlight': {
      return element.data.points.some(
        ([px, py]) => Math.hypot(px - x, py - y) < threshold + element.data.style.width / 2
      )
    }
    case 'rect': {
      const d = element.data
      return x >= d.x - threshold && x <= d.x + d.width + threshold &&
        y >= d.y - threshold && y <= d.y + d.height + threshold
    }
    case 'circle': {
      const d = element.data
      const dx = (x - d.cx) / (Math.abs(d.rx) + threshold)
      const dy = (y - d.cy) / (Math.abs(d.ry) + threshold)
      return dx * dx + dy * dy <= 1
    }
    case 'line': {
      const d = element.data
      const dist = pointToLineDistance(x, y, d.x1, d.y1, d.x2, d.y2)
      return dist < threshold + d.style.width / 2
    }
    case 'text': {
      const d = element.data
      return x >= d.x && x <= d.x + d.width && y >= d.y && y <= d.y + d.height
    }
    default:
      return false
  }
}

function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let t = lenSq !== 0 ? dot / lenSq : -1
  t = Math.max(0, Math.min(1, t))
  const xx = x1 + t * C
  const yy = y1 + t * D
  return Math.hypot(px - xx, py - yy)
}

// ============================================================================
// Canvas Hook
// ============================================================================

export interface UseCanvasOptions {
  initialElements?: BoardElement[]
  userId: string
  onElementAdd?: (element: BoardElement) => void
  onElementsRemove?: (ids: string[]) => void
}

export function useCanvas({ initialElements = [], userId, onElementAdd, onElementsRemove }: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [elements, setElements] = useState<BoardElement[]>(initialElements)
  const [state, setState] = useState<CanvasState>(DEFAULT_CANVAS_STATE)
  const [undoStack, setUndoStack] = useState<BoardElement[][]>([])
  const [redoStack, setRedoStack] = useState<BoardElement[][]>([])

  // Текущий элемент, рисуемый в реальном времени
  const drawingRef = useRef<BoardElement | null>(null)
  const isDrawingRef = useRef(false)
  const startPointRef = useRef<[number, number]>([0, 0])

  // Загружаем начальные элементы
  useEffect(() => {
    if (initialElements.length > 0) {
      setElements(initialElements)
    }
  }, []) // Только при монтировании

  // ========== Рендеринг ==========

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Retina support
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw all elements
    elements.forEach((el) => drawElement(ctx, el))

    // Draw current element being drawn
    if (drawingRef.current) {
      drawElement(ctx, drawingRef.current)
    }
  }, [elements])

  // Рендерим при изменении элементов
  useEffect(() => {
    render()
  }, [render])

  // Resize handler
  useEffect(() => {
    const handleResize = () => render()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [render])

  // ========== Получение координат ==========

  const getCanvasPoint = useCallback((e: React.PointerEvent): [number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }, [])

  // ========== Обработчики рисования ==========

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return // Только левая кнопка
    const [x, y] = getCanvasPoint(e)
    isDrawingRef.current = true
    startPointRef.current = [x, y]

    const tool = state.tool
    const style = getStrokeStyle(state)
    const id = nanoid()

    switch (tool) {
      case 'pen':
      case 'highlight':
        drawingRef.current = {
          id,
          type: tool,
          zIndex: elements.length,
          createdBy: userId,
          data: { points: [[x, y]], style },
        } as PenElement
        break

      case 'rect':
        drawingRef.current = {
          id,
          type: 'rect',
          zIndex: elements.length,
          createdBy: userId,
          data: { x, y, width: 0, height: 0, style, fill: state.fillColor || undefined },
        } as RectElement
        break

      case 'circle':
        drawingRef.current = {
          id,
          type: 'circle',
          zIndex: elements.length,
          createdBy: userId,
          data: { cx: x, cy: y, rx: 0, ry: 0, style, fill: state.fillColor || undefined },
        } as CircleElement
        break

      case 'line':
        drawingRef.current = {
          id,
          type: 'line',
          zIndex: elements.length,
          createdBy: userId,
          data: { x1: x, y1: y, x2: x, y2: y, style },
        } as LineElement
        break

      case 'eraser': {
        // Стираем элементы под курсором
        const hit = elements.filter(el => hitTest(el, x, y, 20))
        if (hit.length > 0) {
          const hitIds = hit.map(el => el.id)
          setUndoStack(prev => [...prev, elements])
          setRedoStack([])
          setElements(prev => prev.filter(el => !hitIds.includes(el.id)))
          onElementsRemove?.(hitIds)
        }
        break
      }

      case 'text': {
        // Создаём текстовый элемент — показываем prompt
        const content = window.prompt('Введите текст:')
        if (content) {
          const textEl: BoardElement = {
            id,
            type: 'text',
            zIndex: elements.length,
            createdBy: userId,
            data: {
              x, y,
              width: Math.max(content.length * state.fontSize * 0.6, 100),
              height: state.fontSize * 1.5,
              content,
              fontSize: state.fontSize,
              fontFamily: 'system-ui, sans-serif',
              color: state.strokeColor,
              bold: false,
              italic: false,
            }
          }
          setUndoStack(prev => [...prev, elements])
          setRedoStack([])
          setElements(prev => [...prev, textEl])
          onElementAdd?.(textEl)
        }
        isDrawingRef.current = false
        break
      }
    }

    // Capture pointer for smooth drawing
    const canvas = canvasRef.current
    if (canvas) {
      canvas.setPointerCapture(e.pointerId)
    }
  }, [state, elements, userId, getCanvasPoint, onElementAdd, onElementsRemove])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return
    const [x, y] = getCanvasPoint(e)

    // Continuous eraser — doesn't use drawingRef
    if (state.tool === 'eraser') {
      const hit = elements.filter(elem => hitTest(elem, x, y, 20))
      if (hit.length > 0) {
        const hitIds = hit.map(elem => elem.id)
        setElements(prev => prev.filter(elem => !hitIds.includes(elem.id)))
        onElementsRemove?.(hitIds)
      }
      render()
      return
    }

    if (!drawingRef.current) return
    const el = drawingRef.current

    switch (el.type) {
      case 'pen':
      case 'highlight':
        (el as PenElement).data.points.push([x, y])
        break

      case 'rect': {
        const d = (el as RectElement).data
        d.width = x - startPointRef.current[0]
        d.height = y - startPointRef.current[1]
        break
      }

      case 'circle': {
        const d = (el as CircleElement).data
        d.rx = (x - startPointRef.current[0]) / 2
        d.ry = (y - startPointRef.current[1]) / 2
        d.cx = startPointRef.current[0] + d.rx
        d.cy = startPointRef.current[1] + d.ry
        break
      }

      case 'line': {
        const d = (el as LineElement).data
        d.x2 = x
        d.y2 = y
        break
      }

      default:
        // eraser handled in handlePointerDown
        break
    }

    render()
  }, [getCanvasPoint, state.tool, elements, render, onElementsRemove])

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const el = drawingRef.current
    if (el && el.type !== 'text') {
      // Минимальная длина для pen/highlight
      if ((el.type === 'pen' || el.type === 'highlight') && el.data.points.length < 2) {
        drawingRef.current = null
        render()
        return
      }

      setUndoStack(prev => [...prev, elements])
      setRedoStack([])
      setElements(prev => [...prev, el])
      onElementAdd?.(el)
    }

    drawingRef.current = null
    render()
  }, [elements, render, onElementAdd])

  // ========== Undo / Redo ==========

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setRedoStack(r => [...r, elements])
    setUndoStack(u => u.slice(0, -1))
    setElements(prev)
  }, [undoStack, elements])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    if (!next) return
    setUndoStack(u => [...u, elements])
    setRedoStack(r => r.slice(0, -1))
    setElements(next)
  }, [redoStack, elements])

  const clear = useCallback(() => {
    if (elements.length === 0) return
    setUndoStack(prev => [...prev, elements])
    setRedoStack([])
    const ids = elements.map(el => el.id)
    setElements([])
    onElementsRemove?.(ids)
  }, [elements, onElementsRemove])

  // ========== Keyboard shortcuts ==========

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }

      // Shortcuts для инструментов
      const shortcuts: Record<string, BoardTool> = {
        v: 'select', p: 'pen', h: 'highlight', t: 'text',
        r: 'rect', c: 'circle', l: 'line', e: 'eraser',
        i: 'image',
      }
      const tool = shortcuts[e.key.toLowerCase()]
      if (tool && !e.ctrlKey && !e.metaKey) {
        setState(prev => ({ ...prev, tool }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // ========== Добавление элемента извне (real-time) ==========

  const addRemoteElement = useCallback((element: BoardElement) => {
    setElements(prev => {
      // Проверяем дубликат
      if (prev.some(el => el.id === element.id)) return prev
      return [...prev, element]
    })
  }, [])

  const removeRemoteElements = useCallback((ids: string[]) => {
    setElements(prev => prev.filter(el => !ids.includes(el.id)))
  }, [])

  return {
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
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    addRemoteElement,
    removeRemoteElements,
    render,
  }
}
