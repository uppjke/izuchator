'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { nanoid } from 'nanoid'
import type {
  BoardElement,
  BoardTool,
  CanvasState,
  ViewportState,
  GridType,
  PenElement,
  RectElement,
  CircleElement,
  TriangleElement,
  LineElement,
  ArrowElement,
  ImageElement,
  StrokeStyle,
} from './types'
import {
  DEFAULT_CANVAS_STATE,
  DEFAULT_VIEWPORT,
  HIGHLIGHT_DEFAULTS,
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_STEP,
} from './types'

// ============================================================================
// Утилиты рендеринга
// ============================================================================

function getStrokeStyle(state: CanvasState): StrokeStyle {
  const toolColor = state.toolColors[state.tool] ?? state.strokeColor
  if (state.tool === 'highlight') {
    return {
      color: toolColor,
      width: HIGHLIGHT_DEFAULTS.width,
      opacity: HIGHLIGHT_DEFAULTS.opacity,
    }
  }
  return {
    color: toolColor,
    width: state.strokeWidth,
    opacity: state.opacity,
  }
}

// ========== Grid drawing ==========

function drawGrid(
  ctx: CanvasRenderingContext2D,
  gridType: GridType,
  viewport: ViewportState,
  canvasW: number,
  canvasH: number
) {
  if (gridType === 'none') return

  const { offsetX, offsetY, scale } = viewport
  const baseGap = 24 // base grid spacing in world coords
  // Adaptive gap: keeps grid visually ~24px on screen
  let gap = baseGap
  while (gap * scale < 12) gap *= 2
  while (gap * scale > 48) gap /= 2

  ctx.save()
  ctx.globalAlpha = 0.45

  // Calculate visible world bounds
  const worldLeft = -offsetX / scale
  const worldTop = -offsetY / scale
  const worldRight = (canvasW - offsetX) / scale
  const worldBottom = (canvasH - offsetY) / scale

  const startX = Math.floor(worldLeft / gap) * gap
  const startY = Math.floor(worldTop / gap) * gap

  switch (gridType) {
    case 'dots': {
      ctx.fillStyle = '#94a3b8'
      const dotR = Math.max(1.5, 1.5 * scale)
      for (let x = startX; x <= worldRight; x += gap) {
        for (let y = startY; y <= worldBottom; y += gap) {
          const sx = x * scale + offsetX
          const sy = y * scale + offsetY
          ctx.beginPath()
          ctx.arc(sx, sy, dotR, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }

    case 'lines': {
      // Horizontal lines only (like ruled paper)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 0.5
      for (let y = startY; y <= worldBottom; y += gap) {
        const sy = y * scale + offsetY
        ctx.beginPath()
        ctx.moveTo(0, sy)
        ctx.lineTo(canvasW, sy)
        ctx.stroke()
      }
      break
    }

    case 'squares': {
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 0.5
      for (let x = startX; x <= worldRight; x += gap) {
        const sx = x * scale + offsetX
        ctx.beginPath()
        ctx.moveTo(sx, 0)
        ctx.lineTo(sx, canvasH)
        ctx.stroke()
      }
      for (let y = startY; y <= worldBottom; y += gap) {
        const sy = y * scale + offsetY
        ctx.beginPath()
        ctx.moveTo(0, sy)
        ctx.lineTo(canvasW, sy)
        ctx.stroke()
      }
      // Heavier major lines every 4 cells
      ctx.globalAlpha = 0.15
      ctx.lineWidth = 1
      const majorGap = gap * 4
      const mStartX = Math.floor(worldLeft / majorGap) * majorGap
      const mStartY = Math.floor(worldTop / majorGap) * majorGap
      for (let x = mStartX; x <= worldRight; x += majorGap) {
        const sx = x * scale + offsetX
        ctx.beginPath()
        ctx.moveTo(sx, 0)
        ctx.lineTo(sx, canvasH)
        ctx.stroke()
      }
      for (let y = mStartY; y <= worldBottom; y += majorGap) {
        const sy = y * scale + offsetY
        ctx.beginPath()
        ctx.moveTo(0, sy)
        ctx.lineTo(canvasW, sy)
        ctx.stroke()
      }
      break
    }
  }

  ctx.restore()
}

// ========== Element drawing ==========

function drawElement(ctx: CanvasRenderingContext2D, element: BoardElement, imageCache: Map<string, HTMLImageElement>, onImageLoad?: () => void) {
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

      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i]![0] + points[i + 1]![0]) / 2
        const yc = (points[i]![1] + points[i + 1]![1]) / 2
        ctx.quadraticCurveTo(points[i]![0], points[i]![1], xc, yc)
      }

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

    case 'arrow': {
      const { x1, y1, x2, y2, style } = element.data
      ctx.globalAlpha = style.opacity
      ctx.strokeStyle = style.color
      ctx.fillStyle = style.color
      ctx.lineWidth = style.width
      ctx.lineCap = 'round'
      // Arrowhead geometry
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const headLen = Math.max(style.width * 3, 12)
      // Shorten line so it ends at arrowhead base (avoids thick line poking through tip)
      const lineEndX = x2 - headLen * 0.6 * Math.cos(angle)
      const lineEndY = y2 - headLen * 0.6 * Math.sin(angle)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(lineEndX, lineEndY)
      ctx.stroke()
      // Draw arrowhead as filled triangle
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
      break
    }

    case 'triangle': {
      const { x, y, width, height, style, fill } = element.data
      ctx.globalAlpha = style.opacity
      ctx.beginPath()
      ctx.moveTo(x + width / 2, y)
      ctx.lineTo(x + width, y + height)
      ctx.lineTo(x, y + height)
      ctx.closePath()
      if (fill) {
        ctx.fillStyle = fill
        ctx.fill()
      }
      ctx.strokeStyle = style.color
      ctx.lineWidth = style.width
      ctx.stroke()
      break
    }

    case 'text': {
      const d = element.data
      ctx.globalAlpha = 1
      ctx.fillStyle = d.color
      ctx.font = `${d.italic ? 'italic ' : ''}${d.bold ? 'bold ' : ''}${d.fontSize}px ${d.fontFamily}`
      ctx.textBaseline = 'top'

      const lines = d.content.split('\n')
      lines.forEach((line, i) => {
        ctx.fillText(line, d.x, d.y + i * d.fontSize * 1.3)
      })
      break
    }

    case 'image': {
      const d = element.data
      const img = imageCache.get(d.src)
      if (img && img.complete) {
        ctx.drawImage(img, d.x, d.y, d.width, d.height)
      } else if (!imageCache.has(d.src)) {
        // Start loading
        const newImg = new Image()
        newImg.crossOrigin = 'anonymous'
        newImg.src = d.src
        imageCache.set(d.src, newImg)
        // Re-render once image is loaded
        newImg.onload = () => {
          onImageLoad?.()
        }
      }
      break
    }
  }

  ctx.restore()
}

// ========== Hit testing ==========

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
    case 'arrow': {
      const d = element.data
      const dist = pointToLineDistance(x, y, d.x1, d.y1, d.x2, d.y2)
      return dist < threshold + d.style.width / 2
    }
    case 'triangle': {
      const d = element.data
      return x >= d.x - threshold && x <= d.x + d.width + threshold &&
        y >= d.y - threshold && y <= d.y + d.height + threshold
    }
    case 'text': {
      const d = element.data
      return x >= d.x && x <= d.x + d.width && y >= d.y && y <= d.y + d.height
    }
    case 'image': {
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

// ========== Element bounding box ==========

function getElementBounds(el: BoardElement): { x: number; y: number; w: number; h: number } | null {
  switch (el.type) {
    case 'pen':
    case 'highlight': {
      if (el.data.points.length === 0) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const [px, py] of el.data.points) {
        if (px < minX) minX = px
        if (py < minY) minY = py
        if (px > maxX) maxX = px
        if (py > maxY) maxY = py
      }
      const pad = el.data.style.width / 2
      return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
    }
    case 'rect':
      return {
        x: Math.min(el.data.x, el.data.x + el.data.width),
        y: Math.min(el.data.y, el.data.y + el.data.height),
        w: Math.abs(el.data.width),
        h: Math.abs(el.data.height),
      }
    case 'circle':
      return {
        x: el.data.cx - Math.abs(el.data.rx),
        y: el.data.cy - Math.abs(el.data.ry),
        w: Math.abs(el.data.rx) * 2,
        h: Math.abs(el.data.ry) * 2,
      }
    case 'line': {
      const lx = Math.min(el.data.x1, el.data.x2)
      const ly = Math.min(el.data.y1, el.data.y2)
      return {
        x: lx,
        y: ly,
        w: Math.abs(el.data.x2 - el.data.x1),
        h: Math.abs(el.data.y2 - el.data.y1),
      }
    }
    case 'arrow': {
      const ax = Math.min(el.data.x1, el.data.x2)
      const ay = Math.min(el.data.y1, el.data.y2)
      return {
        x: ax,
        y: ay,
        w: Math.abs(el.data.x2 - el.data.x1),
        h: Math.abs(el.data.y2 - el.data.y1),
      }
    }
    case 'triangle':
      return {
        x: Math.min(el.data.x, el.data.x + el.data.width),
        y: Math.min(el.data.y, el.data.y + el.data.height),
        w: Math.abs(el.data.width),
        h: Math.abs(el.data.height),
      }
    case 'text':
      return { x: el.data.x, y: el.data.y, w: el.data.width, h: el.data.height }
    case 'image':
      return { x: el.data.x, y: el.data.y, w: el.data.width, h: el.data.height }
    default:
      return null
  }
}

// Move element by delta (returns new element with updated coordinates)
function moveElement(el: BoardElement, dx: number, dy: number): BoardElement {
  const moved = JSON.parse(JSON.stringify(el)) as BoardElement
  switch (moved.type) {
    case 'pen':
    case 'highlight':
      moved.data.points = moved.data.points.map(([px, py]: [number, number]) => [px + dx, py + dy] as [number, number])
      break
    case 'rect':
      moved.data.x += dx
      moved.data.y += dy
      break
    case 'circle':
      moved.data.cx += dx
      moved.data.cy += dy
      break
    case 'line':
      moved.data.x1 += dx
      moved.data.y1 += dy
      moved.data.x2 += dx
      moved.data.y2 += dy
      break
    case 'arrow':
      moved.data.x1 += dx
      moved.data.y1 += dy
      moved.data.x2 += dx
      moved.data.y2 += dy
      break
    case 'triangle':
      moved.data.x += dx
      moved.data.y += dy
      break
    case 'text':
      moved.data.x += dx
      moved.data.y += dy
      break
    case 'image':
      moved.data.x += dx
      moved.data.y += dy
      break
  }
  return moved
}

// ========== Resize helpers ==========

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type EndpointHandle = 'start' | 'end'
type AnyHandle = ResizeHandle | EndpointHandle

interface SelectionAction {
  type: 'move' | 'resize' | 'endpoint'
  handle?: AnyHandle
  startWorld: [number, number]
  originalElements: BoardElement[]
  originalBounds: { x: number; y: number; w: number; h: number }
  committed: boolean
}

/** Check if element is a line or arrow (two-point objects) */
function isLineLike(el: BoardElement): el is LineElement | ArrowElement {
  return el.type === 'line' || el.type === 'arrow'
}

/** Check if selection is a single line-like element */
function isSingleLineLikeSelection(elements: BoardElement[], selectedIds: string[]): (LineElement | ArrowElement) | null {
  if (selectedIds.length !== 1) return null
  const el = elements.find(e => e.id === selectedIds[0])
  if (el && isLineLike(el)) return el
  return null
}

/** Get endpoint positions for a line/arrow element */
function getEndpointPositions(el: LineElement | ArrowElement): { start: [number, number]; end: [number, number] } {
  return {
    start: [el.data.x1, el.data.y1],
    end: [el.data.x2, el.data.y2],
  }
}

/** Hit-test endpoint handles for line/arrow */
function hitTestEndpoint(
  x: number, y: number,
  el: LineElement | ArrowElement,
  handleWorldSize: number,
): EndpointHandle | null {
  const eps = getEndpointPositions(el)
  const half = handleWorldSize / 2
  if (Math.abs(x - eps.start[0]) <= half && Math.abs(y - eps.start[1]) <= half) return 'start'
  if (Math.abs(x - eps.end[0]) <= half && Math.abs(y - eps.end[1]) <= half) return 'end'
  return null
}

/** Move a single endpoint of a line/arrow element */
function moveEndpoint(el: BoardElement, endpoint: EndpointHandle, dx: number, dy: number): BoardElement {
  const moved = JSON.parse(JSON.stringify(el)) as BoardElement
  if (moved.type === 'line' || moved.type === 'arrow') {
    if (endpoint === 'start') {
      moved.data.x1 += dx
      moved.data.y1 += dy
    } else {
      moved.data.x2 += dx
      moved.data.y2 += dy
    }
  }
  return moved
}

const DRAG_THRESHOLD = 3
const SELECTION_PAD = 8

function getUnionBounds(elements: BoardElement[], ids: string[]): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const id of ids) {
    const el = elements.find(e => e.id === id)
    if (!el) continue
    const b = getElementBounds(el)
    if (!b) continue
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  }
  if (!isFinite(minX)) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function pointInRect(px: number, py: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function getHandlePositions(bounds: { x: number; y: number; w: number; h: number }): Record<ResizeHandle, [number, number]> {
  const { x, y, w, h } = bounds
  return {
    nw: [x, y],
    n: [x + w / 2, y],
    ne: [x + w, y],
    e: [x + w, y + h / 2],
    se: [x + w, y + h],
    s: [x + w / 2, y + h],
    sw: [x, y + h],
    w: [x, y + h / 2],
  }
}

function hitTestHandle(
  x: number, y: number,
  bounds: { x: number; y: number; w: number; h: number },
  handleWorldSize: number,
): ResizeHandle | null {
  const positions = getHandlePositions(bounds)
  const half = handleWorldSize / 2
  for (const [handle, pos] of Object.entries(positions)) {
    if (Math.abs(x - pos[0]) <= half && Math.abs(y - pos[1]) <= half) {
      return handle as ResizeHandle
    }
  }
  return null
}

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize',
  sw: 'nesw-resize', w: 'ew-resize',
}

const ENDPOINT_CURSOR = 'crosshair'

function computeResizedBounds(
  original: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = original
  switch (handle) {
    case 'nw': x += dx; y += dy; w -= dx; h -= dy; break
    case 'n': y += dy; h -= dy; break
    case 'ne': w += dx; y += dy; h -= dy; break
    case 'e': w += dx; break
    case 'se': w += dx; h += dy; break
    case 's': h += dy; break
    case 'sw': x += dx; h += dy; w -= dx; break
    case 'w': x += dx; w -= dx; break
  }
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  w = Math.max(w, 5)
  h = Math.max(h, 5)
  return { x, y, w, h }
}

function resizeElement(
  el: BoardElement,
  originalBounds: { x: number; y: number; w: number; h: number },
  newBounds: { x: number; y: number; w: number; h: number },
): BoardElement {
  const resized = JSON.parse(JSON.stringify(el)) as BoardElement
  const ob = originalBounds
  const nb = newBounds
  const canScaleX = ob.w > 1
  const canScaleY = ob.h > 1

  switch (resized.type) {
    case 'pen':
    case 'highlight':
      resized.data.points = resized.data.points.map(([px, py]: [number, number]) => [
        canScaleX ? nb.x + ((px - ob.x) / ob.w) * nb.w : nb.x + nb.w / 2,
        canScaleY ? nb.y + ((py - ob.y) / ob.h) * nb.h : nb.y + nb.h / 2,
      ] as [number, number])
      break
    case 'rect':
      resized.data.x = nb.x
      resized.data.y = nb.y
      resized.data.width = nb.w
      resized.data.height = nb.h
      break
    case 'circle':
      resized.data.cx = nb.x + nb.w / 2
      resized.data.cy = nb.y + nb.h / 2
      resized.data.rx = nb.w / 2
      resized.data.ry = nb.h / 2
      break
    case 'line': {
      const origData = (el as LineElement).data
      resized.data.x1 = canScaleX ? nb.x + ((origData.x1 - ob.x) / ob.w) * nb.w : nb.x + nb.w / 2
      resized.data.y1 = canScaleY ? nb.y + ((origData.y1 - ob.y) / ob.h) * nb.h : nb.y + nb.h / 2
      resized.data.x2 = canScaleX ? nb.x + ((origData.x2 - ob.x) / ob.w) * nb.w : nb.x + nb.w / 2
      resized.data.y2 = canScaleY ? nb.y + ((origData.y2 - ob.y) / ob.h) * nb.h : nb.y + nb.h / 2
      break
    }
    case 'arrow': {
      const origArrow = (el as ArrowElement).data
      resized.data.x1 = canScaleX ? nb.x + ((origArrow.x1 - ob.x) / ob.w) * nb.w : nb.x + nb.w / 2
      resized.data.y1 = canScaleY ? nb.y + ((origArrow.y1 - ob.y) / ob.h) * nb.h : nb.y + nb.h / 2
      resized.data.x2 = canScaleX ? nb.x + ((origArrow.x2 - ob.x) / ob.w) * nb.w : nb.x + nb.w / 2
      resized.data.y2 = canScaleY ? nb.y + ((origArrow.y2 - ob.y) / ob.h) * nb.h : nb.y + nb.h / 2
      break
    }
    case 'triangle':
      resized.data.x = nb.x
      resized.data.y = nb.y
      resized.data.width = nb.w
      resized.data.height = nb.h
      break
    case 'text':
      resized.data.x = nb.x
      resized.data.y = nb.y
      resized.data.width = nb.w
      resized.data.height = nb.h
      break
    case 'image':
      resized.data.x = nb.x
      resized.data.y = nb.y
      resized.data.width = nb.w
      resized.data.height = nb.h
      break
  }
  return resized
}

// ============================================================================
// Canvas Hook
// ============================================================================

export interface UseCanvasOptions {
  initialElements?: BoardElement[]
  userId: string
  onElementAdd?: (element: BoardElement) => void
  onElementsRemove?: (ids: string[]) => void
  onDrawProgress?: (element: BoardElement) => void
  onElementUpdate?: (element: BoardElement) => void
  onMoveDelta?: (elementIds: string[], dx: number, dy: number) => void
  onResizeDelta?: (elementIds: string[], handle: string, dx: number, dy: number, originalBounds: { x: number; y: number; w: number; h: number }) => void
  onSelectionChange?: (elementIds: string[]) => void
}

// Colors for remote user selections (cycle if >6 users)
const REMOTE_SELECTION_COLORS = [
  '#f97316', // orange
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#eab308', // yellow
]

export function useCanvas({ initialElements = [], userId, onElementAdd, onElementsRemove, onDrawProgress, onElementUpdate, onMoveDelta, onResizeDelta, onSelectionChange }: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elementsRef = useRef<BoardElement[]>(initialElements)
  const [elements, _setElements] = useState<BoardElement[]>(initialElements)

  // Wrapper: keeps elementsRef in sync with React state.
  // NEVER do elementsRef.current = elements in the component body — that causes race conditions.
  const setElements = useCallback((action: React.SetStateAction<BoardElement[]>) => {
    _setElements(prev => {
      const next = typeof action === 'function' ? action(prev) : action
      elementsRef.current = next
      return next
    })
  }, [])

  const [state, setState] = useState<CanvasState>(DEFAULT_CANVAS_STATE)
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT)

  // Action-based undo — only tracks current user's own actions, never touches remote elements
  type UndoAction =
    | { type: 'add'; elements: BoardElement[] }       // user added elements → undo removes them
    | { type: 'remove'; elements: BoardElement[] }     // user removed elements → undo adds them back
    | { type: 'update'; before: BoardElement[]; after: BoardElement[] } // user moved/resized → undo restores before
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const [redoStack, setRedoStack] = useState<UndoAction[]>([])

  // Store callbacks in a ref so handlers don't re-create when callbacks change
  const callbacksRef = useRef({ onElementAdd, onElementsRemove, onDrawProgress, onElementUpdate, onMoveDelta, onResizeDelta, onSelectionChange })
  callbacksRef.current = { onElementAdd, onElementsRemove, onDrawProgress, onElementUpdate, onMoveDelta, onResizeDelta, onSelectionChange }

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectionActionRef = useRef<SelectionAction | null>(null)
  const selectionPreviewMapRef = useRef<Map<string, BoardElement>>(new Map())
  const [selectionCursor, setSelectionCursor] = useState<string>('default')
  const rubberBandRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  // Remote in-progress pen drawings from other users (userId -> elementId -> element)
  const remoteDrawingsRef = useRef<Map<string, Map<string, BoardElement>>>(new Map())

  // rAF batching for remote drawing renders
  const renderRafRef = useRef<number>(0)

  // Remote move offsets: elementId -> {dx, dy} — lightweight, no cloning
  const remoteMoveOffsetsRef = useRef<Map<string, { dx: number; dy: number }>>(new Map())

  // Refs for drawing state
  const drawingRef = useRef<BoardElement | null>(null)
  const isDrawingRef = useRef(false)
  const startPointRef = useRef<[number, number]>([0, 0])
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())

  // Throttle for draw-progress emission
  const lastDrawProgressRef = useRef(0)
  const DRAW_PROGRESS_THROTTLE = 50 // ms

  // No throttle for move-delta — emit on every pointer frame for 60fps remote sync
  // The payload is ~100 bytes, so 60fps = ~6KB/s — negligible for WebSocket

  // Pan state
  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number }>({ x: 0, y: 0, ox: 0, oy: 0 })
  const spaceHeldRef = useRef(false)

  // Pinch zoom state
  const pinchRef = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null)
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  // Load elements from server
  const loadElements = useCallback((els: BoardElement[]) => {
    setElements(els)
    setUndoStack([])
    setRedoStack([])
  }, [])

  // ========== Viewport helpers ==========

  const clampScale = useCallback((s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)), [])

  const zoomIn = useCallback(() => {
    setViewport(v => {
      const ns = clampScale(v.scale + ZOOM_STEP)
      const canvas = canvasRef.current
      if (!canvas) return { ...v, scale: ns }
      const rect = canvas.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      const ratio = ns / v.scale
      return { offsetX: cx - (cx - v.offsetX) * ratio, offsetY: cy - (cy - v.offsetY) * ratio, scale: ns }
    })
  }, [clampScale])

  const zoomOut = useCallback(() => {
    setViewport(v => {
      const ns = clampScale(v.scale - ZOOM_STEP)
      const canvas = canvasRef.current
      if (!canvas) return { ...v, scale: ns }
      const rect = canvas.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      const ratio = ns / v.scale
      return { offsetX: cx - (cx - v.offsetX) * ratio, offsetY: cy - (cy - v.offsetY) * ratio, scale: ns }
    })
  }, [clampScale])

  const zoomReset = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) { setViewport(DEFAULT_VIEWPORT); return }
    const rect = canvas.getBoundingClientRect()
    // World origin (0,0) → center of screen
    setViewport({ offsetX: rect.width / 2, offsetY: rect.height / 2, scale: 1 })
  }, [])

  // Zoom towards a point (for wheel / pinch)
  const zoomAtPoint = useCallback((newScale: number, cx: number, cy: number) => {
    setViewport(v => {
      const s = clampScale(newScale)
      // Keep the point (cx, cy) in the same screen position
      const ratio = s / v.scale
      const offsetX = cx - (cx - v.offsetX) * ratio
      const offsetY = cy - (cy - v.offsetY) * ratio
      return { offsetX, offsetY, scale: s }
    })
  }, [clampScale])

  // ========== Screen ↔ World coordinate conversion ==========

  const screenToWorld = useCallback((sx: number, sy: number): [number, number] => {
    return [
      (sx - viewport.offsetX) / viewport.scale,
      (sy - viewport.offsetY) / viewport.scale,
    ]
  }, [viewport])

  const getCanvasPoint = useCallback((e: React.PointerEvent): [number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    return screenToWorld(sx, sy)
  }, [screenToWorld])

  const getScreenPoint = useCallback((e: React.PointerEvent): [number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }, [])

  // ========== Rendering ==========

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw grid (in screen space, grid function handles viewport)
    drawGrid(ctx, state.gridType, viewport, rect.width, rect.height)

    // Apply viewport transform for elements
    ctx.save()
    ctx.translate(viewport.offsetX, viewport.offsetY)
    ctx.scale(viewport.scale, viewport.scale)

    // Draw all elements (with selection preview + remote move offsets)
    const previewMap = selectionPreviewMapRef.current
    const currentElements = elementsRef.current

    // Build flat map of remote pen-in-progress drawings
    const remotePenOverrides = new Map<string, BoardElement>()
    remoteDrawingsRef.current.forEach((userMap) => {
      userMap.forEach((el) => remotePenOverrides.set(el.id, el))
    })

    // Render all elements
    currentElements.forEach((el) => {
      // Priority: local selection preview > remote resize preview > remote pen override > original
      const drawEl = previewMap.get(el.id) || remoteResizePreviewRef.current.get(el.id) || remotePenOverrides.get(el.id) || el
      remotePenOverrides.delete(el.id)

      // Apply remote move offset via canvas translate (zero-allocation)
      const offset = remoteMoveOffsetsRef.current.get(el.id)
      if (offset) {
        ctx.save()
        ctx.translate(offset.dx, offset.dy)
        drawElement(ctx, drawEl, imageCacheRef.current)
        ctx.restore()
      } else {
        drawElement(ctx, drawEl, imageCacheRef.current)
      }
    })

    // Draw remote pen-in-progress that are NOT existing elements (new strokes)
    remotePenOverrides.forEach((el) => drawElement(ctx, el, imageCacheRef.current))

    // Draw current element being drawn
    if (drawingRef.current) {
      drawElement(ctx, drawingRef.current, imageCacheRef.current, render)
    }

    // Draw selection outline with resize handles (union bounds of all selected)
    if (selectedIds.length > 0) {
      // Get union bounds taking previews into account
      const getResolvedElement = (id: string) => previewMap.get(id) || currentElements.find(el => el.id === id)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const id of selectedIds) {
        const el = getResolvedElement(id)
        if (!el) continue
        const b = getElementBounds(el)
        if (!b) continue
        minX = Math.min(minX, b.x)
        minY = Math.min(minY, b.y)
        maxX = Math.max(maxX, b.x + b.w)
        maxY = Math.max(maxY, b.y + b.h)
      }
      if (isFinite(minX)) {
        const bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }

        // Check if single line/arrow for endpoint handles
        const resolvedSingle = selectedIds.length === 1 ? getResolvedElement(selectedIds[0]!) : null
        const singleLineLike = resolvedSingle && isLineLike(resolvedSingle) ? resolvedSingle : null

        if (singleLineLike) {
          // Line/arrow: draw dashed line between endpoints + 2 circular handles
          const eps = getEndpointPositions(singleLineLike)
          ctx.save()

          // Dashed connection line (selection indicator)
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5 / viewport.scale
          ctx.setLineDash([6 / viewport.scale, 3 / viewport.scale])
          ctx.beginPath()
          ctx.moveTo(eps.start[0], eps.start[1])
          ctx.lineTo(eps.end[0], eps.end[1])
          ctx.stroke()

          // Endpoint circles
          ctx.setLineDash([])
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5 / viewport.scale
          const radius = 5 / viewport.scale
          for (const pos of [eps.start, eps.end]) {
            ctx.beginPath()
            ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          }
          ctx.restore()
        } else {
          // Normal shapes: bounding box + 8 square handles
          const pad = SELECTION_PAD
          const bx = bounds.x - pad
          const by = bounds.y - pad
          const bw = bounds.w + pad * 2
          const bh = bounds.h + pad * 2
          const paddedBounds = { x: bx, y: by, w: bw, h: bh }

          ctx.save()
          // Semi-transparent selection fill
          ctx.fillStyle = 'rgba(59, 130, 246, 0.05)'
          ctx.fillRect(bx, by, bw, bh)

          // Dashed border
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5 / viewport.scale
          ctx.setLineDash([6 / viewport.scale, 3 / viewport.scale])
          ctx.strokeRect(bx, by, bw, bh)

          // 8 resize handles
          ctx.setLineDash([])
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5 / viewport.scale
          const hs = 8 / viewport.scale
          const halfHs = hs / 2
          const handles = getHandlePositions(paddedBounds)
          for (const pos of Object.values(handles)) {
            ctx.fillRect(pos[0] - halfHs, pos[1] - halfHs, hs, hs)
            ctx.strokeRect(pos[0] - halfHs, pos[1] - halfHs, hs, hs)
          }
          ctx.restore()
        }
      }
    }

    // Draw remote users' selection outlines (different color per user, no handles)
    remoteSelectionsRef.current.forEach(({ elementIds: rIds, colorIdx }) => {
      const color = REMOTE_SELECTION_COLORS[colorIdx % REMOTE_SELECTION_COLORS.length] ?? '#f97316'
      let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity
      for (const id of rIds) {
        const el = currentElements.find(e => e.id === id)
        if (!el) continue
        // Apply remote move offset if any
        const offset = remoteMoveOffsetsRef.current.get(id)
        const b = getElementBounds(el)
        if (!b) continue
        const ox = offset?.dx ?? 0
        const oy = offset?.dy ?? 0
        rMinX = Math.min(rMinX, b.x + ox)
        rMinY = Math.min(rMinY, b.y + oy)
        rMaxX = Math.max(rMaxX, b.x + b.w + ox)
        rMaxY = Math.max(rMaxY, b.y + b.h + oy)
      }
      if (isFinite(rMinX)) {
        const pad = SELECTION_PAD
        ctx.save()
        // Semi-transparent tinted fill
        ctx.fillStyle = color + '0D' // ~5% opacity
        ctx.fillRect(rMinX - pad, rMinY - pad, rMaxX - rMinX + pad * 2, rMaxY - rMinY + pad * 2)
        // Dashed border in user color
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5 / viewport.scale
        ctx.setLineDash([6 / viewport.scale, 3 / viewport.scale])
        ctx.strokeRect(rMinX - pad, rMinY - pad, rMaxX - rMinX + pad * 2, rMaxY - rMinY + pad * 2)
        ctx.restore()
      }
    })

    // Draw rubber band selection rectangle
    const rb = rubberBandRef.current
    if (rb) {
      ctx.save()
      const rbx = Math.min(rb.x1, rb.x2)
      const rby = Math.min(rb.y1, rb.y2)
      const rbw = Math.abs(rb.x2 - rb.x1)
      const rbh = Math.abs(rb.y2 - rb.y1)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'
      ctx.fillRect(rbx, rby, rbw, rbh)
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1 / viewport.scale
      ctx.setLineDash([4 / viewport.scale, 3 / viewport.scale])
      ctx.strokeRect(rbx, rby, rbw, rbh)
      ctx.restore()
    }

    ctx.restore()
  }, [state.gridType, viewport, selectedIds])

  // Re-render on element changes
  useEffect(() => {
    render()
  }, [render, elements])

  // Notify parent when selection changes (for remote selection sync)
  useEffect(() => {
    callbacksRef.current.onSelectionChange?.(selectedIds)
  }, [selectedIds])

  // Resize handler
  useEffect(() => {
    const handleResize = () => render()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [render])

  // Prevent native touch behaviors
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const preventTouch = (e: TouchEvent) => {
      e.preventDefault()
    }

    canvas.addEventListener('touchstart', preventTouch, { passive: false })
    canvas.addEventListener('touchmove', preventTouch, { passive: false })
    canvas.addEventListener('touchend', preventTouch, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', preventTouch)
      canvas.removeEventListener('touchmove', preventTouch)
      canvas.removeEventListener('touchend', preventTouch)
    }
  }, [])

  // ========== Wheel zoom ==========

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on trackpad sends ctrlKey + wheel
        const delta = -e.deltaY * 0.01
        setViewport(v => {
          const ns = clampScale(v.scale * (1 + delta))
          const ratio = ns / v.scale
          return { offsetX: cx - (cx - v.offsetX) * ratio, offsetY: cy - (cy - v.offsetY) * ratio, scale: ns }
        })
      } else {
        // Pan
        setViewport(v => ({
          ...v,
          offsetX: v.offsetX - e.deltaX,
          offsetY: v.offsetY - e.deltaY,
        }))
      }
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [clampScale])

  // ========== Space key for temporary pan ==========

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        spaceHeldRef.current = true
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ========== Pointer handlers ==========

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.button !== 0 && e.pointerType === 'mouse') return

    // Track touches for pinch
    if (e.pointerType === 'touch') {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      // Two fingers = pinch/pan
      if (activeTouchesRef.current.size === 2) {
        const pts = Array.from(activeTouchesRef.current.values())
        const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
        const cx = (pts[0]!.x + pts[1]!.x) / 2
        const cy = (pts[0]!.y + pts[1]!.y) / 2
        pinchRef.current = { dist, scale: viewport.scale, cx, cy }
        isPanningRef.current = false
        isDrawingRef.current = false
        drawingRef.current = null

        const canvas = canvasRef.current
        if (canvas) canvas.setPointerCapture(e.pointerId)
        return
      }
    }

    // Pan mode
    if (state.tool === 'pan' || spaceHeldRef.current || (e.pointerType === 'mouse' && e.button === 1)) {
      isPanningRef.current = true
      const [sx, sy] = getScreenPoint(e)
      panStartRef.current = { x: sx, y: sy, ox: viewport.offsetX, oy: viewport.offsetY }

      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      return
    }

    const [x, y] = getCanvasPoint(e)

    const tool = state.tool

    // ===== Select tool: multi-select, drag, resize, rubber band =====
    if (tool === 'select') {
      const shiftKey = e.shiftKey

      // 1. Check handles of current selection
      if (selectedIds.length > 0) {
        const unionBounds = getUnionBounds(elements, selectedIds)
        if (unionBounds) {
          const handleHitSize = Math.max(12, 12 / viewport.scale)

          // 1a. For single line/arrow: check endpoint handles first
          const lineLikeEl = isSingleLineLikeSelection(elements, selectedIds)
          if (lineLikeEl) {
            const endpoint = hitTestEndpoint(x, y, lineLikeEl, handleHitSize)
            if (endpoint) {
              const origEls = [JSON.parse(JSON.stringify(lineLikeEl))]
              selectionActionRef.current = {
                type: 'endpoint', handle: endpoint,
                startWorld: [x, y],
                originalElements: origEls,
                originalBounds: unionBounds,
                committed: false,
              }
              selectionPreviewMapRef.current.clear()
              setSelectionCursor(ENDPOINT_CURSOR)
              const canvas = canvasRef.current
              if (canvas) canvas.setPointerCapture(e.pointerId)
              return
            }
          }

          // 1b. For normal shapes: check 8 resize handles
          if (!lineLikeEl) {
            const pad = SELECTION_PAD
            const paddedBounds = { x: unionBounds.x - pad, y: unionBounds.y - pad, w: unionBounds.w + pad * 2, h: unionBounds.h + pad * 2 }
            const handle = hitTestHandle(x, y, paddedBounds, handleHitSize)
            if (handle) {
              const origEls = selectedIds.map(id => elements.find(el => el.id === id)!).filter(Boolean)
              selectionActionRef.current = {
                type: 'resize', handle,
                startWorld: [x, y],
                originalElements: JSON.parse(JSON.stringify(origEls)),
                originalBounds: unionBounds,
                committed: false,
              }
              selectionPreviewMapRef.current.clear()
              setSelectionCursor(HANDLE_CURSORS[handle])
              const canvas = canvasRef.current
              if (canvas) canvas.setPointerCapture(e.pointerId)
              return
            }
          }

          // 2. Click inside selection bounding box → start move for all selected
          //    BUT: if a higher-z unselected element is under the cursor, fall through
          //    to step 3 to allow selecting elements that overlap with the current selection.
          const pad = SELECTION_PAD
          const paddedBounds = { x: unionBounds.x - pad, y: unionBounds.y - pad, w: unionBounds.w + pad * 2, h: unionBounds.h + pad * 2 }
          if (pointInRect(x, y, paddedBounds)) {
            // Check if there's a higher-z non-selected element directly under cursor
            const topSelected = Math.max(...selectedIds.map(id => {
              const idx = elements.findIndex(el => el.id === id)
              return idx
            }))
            const higherHit = [...elements].slice(topSelected + 1).reverse().find(el =>
              !selectedIds.includes(el.id) && hitTest(el, x, y, 10)
            )

            if (!higherHit) {
              const origEls = selectedIds.map(id => elements.find(el => el.id === id)!).filter(Boolean)
              selectionActionRef.current = {
                type: 'move',
                startWorld: [x, y],
                originalElements: JSON.parse(JSON.stringify(origEls)),
                originalBounds: unionBounds,
                committed: false,
              }
              selectionPreviewMapRef.current.clear()
              setSelectionCursor('grab')
              const canvas = canvasRef.current
              if (canvas) canvas.setPointerCapture(e.pointerId)
              return
            }
            // else: fall through to step 3 — select the higher element
          }
        }
      }

      // 3. Hit-test individual elements
      const hitEl = [...elements].reverse().find(el => hitTest(el, x, y, 10))
      if (hitEl) {
        let newIds: string[]
        if (shiftKey) {
          // Toggle element in selection
          if (selectedIds.includes(hitEl.id)) {
            newIds = selectedIds.filter(id => id !== hitEl.id)
          } else {
            newIds = [...selectedIds, hitEl.id]
          }
        } else {
          newIds = [hitEl.id]
        }
        setSelectedIds(newIds)
        // Start potential move
        const origEls = newIds.map(id => elements.find(el => el.id === id)!).filter(Boolean)
        const ub = getUnionBounds(elements, newIds)
        selectionActionRef.current = {
          type: 'move',
          startWorld: [x, y],
          originalElements: JSON.parse(JSON.stringify(origEls)),
          originalBounds: ub!,
          committed: false,
        }
        selectionPreviewMapRef.current.clear()
        setSelectionCursor('grab')
      } else {
        // 4. Click on empty space → start rubber band selection
        if (!shiftKey) {
          setSelectedIds([])
        }
        selectionActionRef.current = null
        selectionPreviewMapRef.current.clear()
        rubberBandRef.current = { x1: x, y1: y, x2: x, y2: y }
        setSelectionCursor('crosshair')
      }
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      return
    }

    // Deselect when switching to other tools
    if (selectedIds.length > 0) {
      setSelectedIds([])
      selectionActionRef.current = null
      selectionPreviewMapRef.current.clear()
    }

    isDrawingRef.current = true
    startPointRef.current = [x, y]

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

      case 'arrow':
        drawingRef.current = {
          id,
          type: 'arrow',
          zIndex: elements.length,
          createdBy: userId,
          data: { x1: x, y1: y, x2: x, y2: y, style },
        } as ArrowElement
        break

      case 'triangle':
        drawingRef.current = {
          id,
          type: 'triangle',
          zIndex: elements.length,
          createdBy: userId,
          data: { x, y, width: 0, height: 0, style, fill: state.fillColor || undefined },
        } as TriangleElement
        break

      case 'eraser': {
        const hit = elements.filter(el => hitTest(el, x, y, 20))
        if (hit.length > 0) {
          const hitIds = hit.map(el => el.id)
          setUndoStack(prev => [...prev, { type: 'remove' as const, elements: hit }])
          setRedoStack([])
          setElements(prev => prev.filter(el => !hitIds.includes(el.id)))
          callbacksRef.current.onElementsRemove?.(hitIds)
        }
        break
      }

      case 'text': {
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
              color: state.toolColors['text'] ?? state.strokeColor,
              bold: false,
              italic: false,
            }
          }
          setUndoStack(prev => [...prev, { type: 'add' as const, elements: [textEl] }])
          setRedoStack([])
          setElements(prev => [...prev, textEl])
          callbacksRef.current.onElementAdd?.(textEl)
        }
        isDrawingRef.current = false
        break
      }
    }

    const canvas = canvasRef.current
    if (canvas) canvas.setPointerCapture(e.pointerId)
  }, [state, elements, userId, viewport, selectedIds, getCanvasPoint, getScreenPoint])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    e.preventDefault()

    // Handle touch tracking
    if (e.pointerType === 'touch') {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    // Pinch zoom
    if (pinchRef.current && activeTouchesRef.current.size === 2) {
      const pts = Array.from(activeTouchesRef.current.values())
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
      const cx = (pts[0]!.x + pts[1]!.x) / 2
      const cy = (pts[0]!.y + pts[1]!.y) / 2
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const scx = cx - rect.left
        const scy = cy - rect.top
        const newScale = clampScale(pinchRef.current.scale * (dist / pinchRef.current.dist))
        zoomAtPoint(newScale, scx, scy)
      }
      return
    }

    // Pan
    if (isPanningRef.current) {
      const [sx, sy] = getScreenPoint(e)
      setViewport(v => ({
        ...v,
        offsetX: panStartRef.current.ox + (sx - panStartRef.current.x),
        offsetY: panStartRef.current.oy + (sy - panStartRef.current.y),
      }))
      return
    }

    // Select/drag/resize mode
    if (selectionActionRef.current) {
      const [x, y] = getCanvasPoint(e)
      const action = selectionActionRef.current
      const dx = x - action.startWorld[0]
      const dy = y - action.startWorld[1]
      if (!action.committed && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      action.committed = true

      selectionPreviewMapRef.current.clear()
      if (action.type === 'move') {
        for (const orig of action.originalElements) {
          selectionPreviewMapRef.current.set(orig.id, moveElement(orig, dx, dy))
        }
        setSelectionCursor('grabbing')
      } else if (action.type === 'endpoint' && action.handle) {
        // Drag single endpoint of line/arrow
        for (const orig of action.originalElements) {
          selectionPreviewMapRef.current.set(orig.id, moveEndpoint(orig, action.handle as EndpointHandle, dx, dy))
        }
      } else if (action.type === 'resize' && action.handle) {
        const newBounds = computeResizedBounds(action.originalBounds, action.handle as ResizeHandle, dx, dy)
        for (const orig of action.originalElements) {
          selectionPreviewMapRef.current.set(orig.id, resizeElement(orig, action.originalBounds, newBounds))
        }
      }

      // Emit move/resize/endpoint delta to other users on every frame
      if (action.type === 'move') {
        const ids = action.originalElements.map(e => e.id)
        callbacksRef.current.onMoveDelta?.(ids, dx, dy)
      } else if (action.type === 'resize' && action.handle) {
        const ids = action.originalElements.map(e => e.id)
        callbacksRef.current.onResizeDelta?.(ids, action.handle as string, dx, dy, action.originalBounds)
      } else if (action.type === 'endpoint' && action.handle) {
        // Reuse resize delta channel with endpoint handle name
        const ids = action.originalElements.map(e => e.id)
        callbacksRef.current.onResizeDelta?.(ids, action.handle as string, dx, dy, action.originalBounds)
      }

      render()
      return
    }

    // Rubber band selection
    if (rubberBandRef.current) {
      const [x, y] = getCanvasPoint(e)
      rubberBandRef.current.x2 = x
      rubberBandRef.current.y2 = y
      render()
      return
    }

    if (!isDrawingRef.current) {
      // Hover cursor detection for select tool
      if (state.tool === 'select') {
        const [x, y] = getCanvasPoint(e)
        let cursor = 'default'
        if (selectedIds.length > 0) {
          const unionBounds = getUnionBounds(elements, selectedIds)
          if (unionBounds) {
            const handleHitSize = Math.max(12, 12 / viewport.scale)

            // Check endpoint handles for single line/arrow
            const lineLikeEl = isSingleLineLikeSelection(elements, selectedIds)
            if (lineLikeEl) {
              const endpoint = hitTestEndpoint(x, y, lineLikeEl, handleHitSize)
              if (endpoint) {
                cursor = ENDPOINT_CURSOR
              } else {
                const pad = SELECTION_PAD
                const paddedBounds = { x: unionBounds.x - pad, y: unionBounds.y - pad, w: unionBounds.w + pad * 2, h: unionBounds.h + pad * 2 }
                if (pointInRect(x, y, paddedBounds)) {
                  cursor = 'grab'
                }
              }
            } else {
              // Regular shapes: check 8 resize handles
              const pad = SELECTION_PAD
              const paddedBounds = { x: unionBounds.x - pad, y: unionBounds.y - pad, w: unionBounds.w + pad * 2, h: unionBounds.h + pad * 2 }
              const handle = hitTestHandle(x, y, paddedBounds, handleHitSize)
              if (handle) {
                cursor = HANDLE_CURSORS[handle]
              } else if (pointInRect(x, y, paddedBounds)) {
                cursor = 'grab'
              }
            }
          }
        }
        if (cursor === 'default') {
          const hitEl = [...elements].reverse().find(el => hitTest(el, x, y, 10))
          if (hitEl) cursor = 'pointer'
        }
        setSelectionCursor(cursor)
      }
      return
    }
    const [x, y] = getCanvasPoint(e)

    // Continuous eraser
    if (state.tool === 'eraser') {
      const hit = elements.filter(elem => hitTest(elem, x, y, 20))
      if (hit.length > 0) {
        const hitIds = hit.map(elem => elem.id)
        setElements(prev => prev.filter(elem => !hitIds.includes(elem.id)))
        callbacksRef.current.onElementsRemove?.(hitIds)
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

      case 'arrow': {
        const d = (el as ArrowElement).data
        d.x2 = x
        d.y2 = y
        break
      }

      case 'triangle': {
        const d = (el as TriangleElement).data
        d.width = x - startPointRef.current[0]
        d.height = y - startPointRef.current[1]
        break
      }

      default:
        break
    }

    // Emit draw progress (throttled)
    const now = Date.now()
    if (now - lastDrawProgressRef.current >= DRAW_PROGRESS_THROTTLE) {
      lastDrawProgressRef.current = now
      // Deep-copy the element to avoid reference issues
      const snapshot = JSON.parse(JSON.stringify(el)) as BoardElement
      callbacksRef.current.onDrawProgress?.(snapshot)
    }

    render()
  }, [getCanvasPoint, getScreenPoint, state.tool, elements, viewport, selectedIds, render, clampScale, zoomAtPoint])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Remove touch from tracking
    if (e.pointerType === 'touch') {
      activeTouchesRef.current.delete(e.pointerId)
      if (activeTouchesRef.current.size < 2) {
        pinchRef.current = null
      }
    }

    if (isPanningRef.current) {
      isPanningRef.current = false
      return
    }

    // Commit selection action (move, resize, or endpoint) for all selected
    if (selectionActionRef.current) {
      const action = selectionActionRef.current
      selectionActionRef.current = null
      const previewMap = selectionPreviewMapRef.current

      if (action.committed && previewMap.size > 0) {
        // Emit one last delta to close the throttle gap (remote user snaps to exact final position)
        const [x, y] = getCanvasPoint(e)
        const finalDx = x - action.startWorld[0]
        const finalDy = y - action.startWorld[1]
        const ids = action.originalElements.map(el => el.id)
        if (action.type === 'move') {
          callbacksRef.current.onMoveDelta?.(ids, finalDx, finalDy)
        } else if ((action.type === 'resize' || action.type === 'endpoint') && action.handle) {
          callbacksRef.current.onResizeDelta?.(ids, action.handle as string, finalDx, finalDy, action.originalBounds)
        }

        const updatedEls = Array.from(previewMap.values())
        setUndoStack(prev => [...prev, { type: 'update' as const, before: action.originalElements, after: updatedEls }])
        setRedoStack([])
        setElements(prev => prev.map(el => previewMap.get(el.id) || el))
        for (const upd of updatedEls) {
          callbacksRef.current.onElementUpdate?.(upd)
        }
      }
      selectionPreviewMapRef.current = new Map()
      setSelectionCursor(selectedIds.length > 0 ? 'grab' : 'default')
      render()
      return
    }

    // Commit rubber band selection
    if (rubberBandRef.current) {
      const rb = rubberBandRef.current
      rubberBandRef.current = null
      const rbx = Math.min(rb.x1, rb.x2)
      const rby = Math.min(rb.y1, rb.y2)
      const rbw = Math.abs(rb.x2 - rb.x1)
      const rbh = Math.abs(rb.y2 - rb.y1)

      if (rbw > DRAG_THRESHOLD || rbh > DRAG_THRESHOLD) {
        const rbRect = { x: rbx, y: rby, w: rbw, h: rbh }
        const hitIds: string[] = []
        for (const el of elements) {
          const b = getElementBounds(el)
          if (b && rectsIntersect(rbRect, b)) {
            hitIds.push(el.id)
          }
        }
        if (e.shiftKey) {
          // Add to existing selection
          const combined = [...new Set([...selectedIds, ...hitIds])]
          setSelectedIds(combined)
        } else {
          setSelectedIds(hitIds)
        }
      }
      setSelectionCursor('default')
      render()
      return
    }

    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const el = drawingRef.current
    if (el && el.type !== 'text') {
      if ((el.type === 'pen' || el.type === 'highlight') && el.data.points.length < 2) {
        drawingRef.current = null
        render()
        return
      }

      setUndoStack(prev => [...prev, { type: 'add' as const, elements: [el] }])
      setRedoStack([])
      setElements(prev => [...prev, el])
      callbacksRef.current.onElementAdd?.(el)

      // Auto-select shapes after creation (not pen/highlight)
      const autoSelectTypes = ['rect', 'circle', 'triangle', 'line', 'arrow']
      if (autoSelectTypes.includes(el.type)) {
        setSelectedIds([el.id])
        setState(prev => ({ ...prev, tool: 'select' }))
      }
    }

    drawingRef.current = null
    render()
  }, [elements, selectedIds, render, getCanvasPoint])

  // ========== Clipboard paste (images + PDF) ==========

  const addImageElement = useCallback((src: string, w: number, h: number, preloadedImg?: HTMLImageElement) => {
    // Place in center of current viewport
    const canvas = canvasRef.current
    let cx = 400, cy = 300
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      ;[cx, cy] = [
        (rect.width / 2 - viewport.offsetX) / viewport.scale,
        (rect.height / 2 - viewport.offsetY) / viewport.scale,
      ]
    }
    // Scale large images to fit ~400px max
    const maxDim = 400
    let iw = w, ih = h
    if (iw > maxDim || ih > maxDim) {
      const ratio = Math.min(maxDim / iw, maxDim / ih)
      iw = Math.round(iw * ratio)
      ih = Math.round(ih * ratio)
    }

    const imgEl: ImageElement = {
      id: nanoid(),
      type: 'image',
      zIndex: elements.length,
      createdBy: userId,
      data: {
        x: cx - iw / 2,
        y: cy - ih / 2,
        width: iw,
        height: ih,
        src,
      },
    }

    // Pre-populate image cache so first render draws immediately
    if (preloadedImg && preloadedImg.complete) {
      imageCacheRef.current.set(src, preloadedImg)
    }

    setUndoStack(prev => [...prev, { type: 'add' as const, elements: [imgEl] }])
    setRedoStack([])
    setElements(prev => [...prev, imgEl])
    callbacksRef.current.onElementAdd?.(imgEl)

    // Auto-select image after adding
    setSelectedIds([imgEl.id])
    setState(prev => ({ ...prev, tool: 'select' }))
  }, [elements, userId, viewport])

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      // Image from clipboard
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = () => {
          const src = reader.result as string
          const img = new Image()
          img.onload = () => addImageElement(src, img.naturalWidth, img.naturalHeight, img)
          img.src = src
        }
        reader.readAsDataURL(blob)
        return
      }

      // PDF from clipboard (as file)
      if (item.type === 'application/pdf') {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        try {
          await renderPdfFirstPage(blob)
        } catch (err) {
          console.error('PDF paste error:', err)
        }
        return
      }
    }

    // Also check for files (might have PDF)
    const files = e.clipboardData?.files
    if (files) {
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf') {
          e.preventDefault()
          try {
            await renderPdfFirstPage(file)
          } catch (err) {
            console.error('PDF paste error:', err)
          }
          return
        }
        if (file.type.startsWith('image/')) {
          e.preventDefault()
          const reader = new FileReader()
          reader.onload = () => {
            const src = reader.result as string
            const img = new Image()
            img.onload = () => addImageElement(src, img.naturalWidth, img.naturalHeight, img)
            img.src = src
          }
          reader.readAsDataURL(file)
          return
        }
      }
    }
  }, [addImageElement])

  // Load pdf.js from CDN at runtime (avoids bundling pdfjs-dist)
  const PDF_JS_VERSION = '4.9.155'
  const PDF_JS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}`

  const loadPdfJs = useCallback(async (): Promise<typeof globalThis extends { pdfjsLib: infer T } ? T : any> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `${PDF_JS_CDN}/pdf.min.mjs`
      script.type = 'module'

      // Fallback: use classic script instead of module for broader compat
      const classicScript = document.createElement('script')
      classicScript.src = `${PDF_JS_CDN}/pdf.min.js`
      classicScript.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lib = (window as any).pdfjsLib
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = `${PDF_JS_CDN}/pdf.worker.min.js`
          resolve(lib)
        } else {
          reject(new Error('pdfjsLib not found on window'))
        }
      }
      classicScript.onerror = () => reject(new Error('Failed to load pdf.js from CDN'))
      document.head.appendChild(classicScript)
    })
  }, [])

  // Render first page of PDF to canvas → base64 image
  const renderPdfFirstPage = useCallback(async (blob: Blob) => {
    try {
      const pdfjsLib = await loadPdfJs()

      const arrayBuf = await blob.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuf) }).promise
      const page = await pdf.getPage(1)

      const scale = 2 // High-res
      const vp = page.getViewport({ scale })
      const offscreen = document.createElement('canvas')
      offscreen.width = vp.width
      offscreen.height = vp.height
      const ctx = offscreen.getContext('2d')!

      await page.render({ canvasContext: ctx, viewport: vp }).promise
      const dataUrl = offscreen.toDataURL('image/png')
      // Pre-load image so it renders immediately
      const img = new Image()
      img.src = dataUrl
      img.onload = () => addImageElement(dataUrl, vp.width / scale, vp.height / scale, img)
    } catch (err) {
      console.error('Failed to render PDF:', err)
    }
  }, [addImageElement, loadPdfJs])

  // Paste listener
  useEffect(() => {
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  // ========== Undo / Redo ==========

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const action = undoStack[undoStack.length - 1]!
    setUndoStack(u => u.slice(0, -1))

    // Build inverse action for redo
    switch (action.type) {
      case 'add': {
        // User added these elements → undo = remove them
        const ids = new Set(action.elements.map(e => e.id))
        setRedoStack(r => [...r, action])
        setElements(prev => prev.filter(el => !ids.has(el.id)))
        // Notify server
        callbacksRef.current.onElementsRemove?.(Array.from(ids))
        break
      }
      case 'remove': {
        // User removed these elements → undo = add them back
        setRedoStack(r => [...r, action])
        setElements(prev => [...prev, ...action.elements])
        // Notify server
        for (const el of action.elements) {
          callbacksRef.current.onElementAdd?.(el)
        }
        break
      }
      case 'update': {
        // User updated elements → undo = restore "before" versions
        const beforeMap = new Map(action.before.map(e => [e.id, e]))
        setRedoStack(r => [...r, action])
        setElements(prev => prev.map(el => beforeMap.get(el.id) || el))
        // Notify server
        for (const el of action.before) {
          callbacksRef.current.onElementUpdate?.(el)
        }
        break
      }
    }
  }, [undoStack])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return
    const action = redoStack[redoStack.length - 1]!
    setRedoStack(r => r.slice(0, -1))

    // Re-apply the action
    switch (action.type) {
      case 'add': {
        // Re-add elements
        setUndoStack(u => [...u, action])
        setElements(prev => [...prev, ...action.elements])
        for (const el of action.elements) {
          callbacksRef.current.onElementAdd?.(el)
        }
        break
      }
      case 'remove': {
        // Re-remove elements
        const ids = new Set(action.elements.map(e => e.id))
        setUndoStack(u => [...u, action])
        setElements(prev => prev.filter(el => !ids.has(el.id)))
        callbacksRef.current.onElementsRemove?.(Array.from(ids))
        break
      }
      case 'update': {
        // Re-apply "after" versions
        const afterMap = new Map(action.after.map(e => [e.id, e]))
        setUndoStack(u => [...u, action])
        setElements(prev => prev.map(el => afterMap.get(el.id) || el))
        for (const el of action.after) {
          callbacksRef.current.onElementUpdate?.(el)
        }
        break
      }
    }
  }, [redoStack])

  const clear = useCallback(() => {
    if (elements.length === 0) return
    // Only clear elements created by this user
    const myElements = elements.filter(el => el.createdBy === userId)
    if (myElements.length === 0) return
    const ids = myElements.map(el => el.id)
    const idSet = new Set(ids)
    setUndoStack(prev => [...prev, { type: 'remove' as const, elements: myElements }])
    setRedoStack([])
    setElements(prev => prev.filter(el => !idSet.has(el.id)))
    callbacksRef.current.onElementsRemove?.(ids)
  }, [elements, userId])

  // Delete selected elements
  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    selectionActionRef.current = null
    selectionPreviewMapRef.current.clear()
    const removedEls = elements.filter(el => selectedIds.includes(el.id))
    if (removedEls.length === 0) return
    setUndoStack(prev => [...prev, { type: 'remove' as const, elements: removedEls }])
    setRedoStack([])
    setElements(prev => prev.filter(el => !selectedIds.includes(el.id)))
    callbacksRef.current.onElementsRemove?.(selectedIds)
    setSelectedIds([])
    setSelectionCursor('default')
  }, [elements, selectedIds])

  // Duplicate selected elements (offset by 20px)
  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    const offset = 20 / viewport.scale
    const origEls = selectedIds.map(id => elements.find(el => el.id === id)).filter(Boolean) as BoardElement[]
    if (origEls.length === 0) return
    const newEls: BoardElement[] = origEls.map(el => {
      const clone = JSON.parse(JSON.stringify(el)) as BoardElement
      clone.id = nanoid()
      clone.createdBy = userId
      // Offset the clone
      const d = clone.data as Record<string, unknown>
      if ('points' in d && Array.isArray(d.points)) {
        d.points = (d.points as number[][]).map((pt: number[]) => [(pt[0] ?? 0) + offset, (pt[1] ?? 0) + offset])
      }
      if ('x' in d && typeof d.x === 'number') d.x = (d.x as number) + offset
      if ('y' in d && typeof d.y === 'number') d.y = (d.y as number) + offset
      if ('cx' in d && typeof d.cx === 'number') d.cx = (d.cx as number) + offset
      if ('cy' in d && typeof d.cy === 'number') d.cy = (d.cy as number) + offset
      if ('x1' in d && typeof d.x1 === 'number') d.x1 = (d.x1 as number) + offset
      if ('y1' in d && typeof d.y1 === 'number') d.y1 = (d.y1 as number) + offset
      if ('x2' in d && typeof d.x2 === 'number') d.x2 = (d.x2 as number) + offset
      if ('y2' in d && typeof d.y2 === 'number') d.y2 = (d.y2 as number) + offset
      return clone
    })
    setUndoStack(prev => [...prev, { type: 'add' as const, elements: newEls }])
    setRedoStack([])
    setElements(prev => [...prev, ...newEls])
    for (const el of newEls) {
      callbacksRef.current.onElementAdd?.(el)
    }
    setSelectedIds(newEls.map(el => el.id))
  }, [elements, selectedIds, userId, viewport.scale])

  // Get selection bounds in screen coordinates (for context menu positioning)
  const getSelectionScreenBounds = useCallback((): { x: number; y: number; w: number; h: number } | null => {
    if (selectedIds.length === 0) return null
    const bounds = getUnionBounds(elements, selectedIds)
    if (!bounds) return null
    const pad = SELECTION_PAD
    return {
      x: (bounds.x - pad) * viewport.scale + viewport.offsetX,
      y: (bounds.y - pad) * viewport.scale + viewport.offsetY,
      w: (bounds.w + pad * 2) * viewport.scale,
      h: (bounds.h + pad * 2) * viewport.scale,
    }
  }, [elements, selectedIds, viewport])

  // ========== Keyboard shortcuts ==========

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }

      // Duplicate selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedIds.length > 0) {
        e.preventDefault()
        duplicateSelected()
        return
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomIn()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomOut()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        zoomReset()
        return
      }

      // Delete selected elements
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        deleteSelected()
        return
      }

      // Escape deselects and cancels active drag/resize
      if (e.key === 'Escape' && selectedIds.length > 0) {
        selectionActionRef.current = null
        selectionPreviewMapRef.current.clear()
        rubberBandRef.current = null
        setSelectedIds([])
        setSelectionCursor('default')
        return
      }

      const shortcuts: Record<string, BoardTool> = {
        v: 'select', p: 'pen', h: 'highlight', t: 'text',
        r: 'rect', c: 'circle', l: 'line', e: 'eraser',
        i: 'image',
      }
      const tool = shortcuts[e.key.toLowerCase()]
      if (tool && !e.ctrlKey && !e.metaKey) {
        setState(prev => ({ ...prev, tool }))
        if (tool !== 'select') {
          setSelectedIds([])
          selectionActionRef.current = null
          selectionPreviewMapRef.current.clear()
          setSelectionCursor('default')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, zoomIn, zoomOut, zoomReset, selectedIds, elements, deleteSelected, duplicateSelected])

  // ========== Remote element sync ==========

  // Batch incoming remote elements to avoid N separate setElements calls
  const pendingRemoteRef = useRef<BoardElement[]>([])
  const flushScheduledRef = useRef(false)

  const addRemoteElement = useCallback((element: BoardElement) => {
    // Clear pen drawing overlay for this element
    remoteDrawingsRef.current.forEach((userMap, userId) => {
      userMap.delete(element.id)
      if (userMap.size === 0) remoteDrawingsRef.current.delete(userId)
    })

    // Clear move offset (committed position replaces it)
    remoteMoveOffsetsRef.current.delete(element.id)
    // Clear resize preview (committed position replaces it)
    remoteResizePreviewRef.current.delete(element.id)

    // Batch: queue element, flush once in microtask
    pendingRemoteRef.current.push(element)
    if (!flushScheduledRef.current) {
      flushScheduledRef.current = true
      queueMicrotask(() => {
        const batch = pendingRemoteRef.current
        pendingRemoteRef.current = []
        flushScheduledRef.current = false
        if (batch.length === 0) return

        // 1. Update elementsRef directly (immediate visual correctness)
        const updated = [...elementsRef.current]
        for (const el of batch) {
          // Also clear any remaining offsets/previews
          remoteMoveOffsetsRef.current.delete(el.id)
          remoteResizePreviewRef.current.delete(el.id)
          const idx = updated.findIndex(e => e.id === el.id)
          if (idx >= 0) updated[idx] = el
          else updated.push(el)
        }
        elementsRef.current = updated

        // 2. Render immediately (before React commit)
        render()

        // 3. Sync React state (for undo, save, toolbar)
        _setElements(() => updated)
      })
    }
  }, [render])

  // Update an existing element (e.g. moved by remote user)
  const updateRemoteElement = useCallback((element: BoardElement) => {
    setElements(prev => prev.map(el => el.id === element.id ? element : el))
  }, [])

  const removeRemoteElements = useCallback((ids: string[]) => {
    for (const id of ids) remoteMoveOffsetsRef.current.delete(id)
    setElements(prev => prev.filter(el => !ids.includes(el.id)))
  }, [])

  // Remote selections: track other users' selection outlines
  const remoteSelectionsRef = useRef<Map<string, { elementIds: string[]; colorIdx: number }>>(new Map())
  const remoteSelColorIdxRef = useRef(0)

  const setRemoteSelection = useCallback((remoteUserId: string, elementIds: string[]) => {
    if (elementIds.length === 0) {
      remoteSelectionsRef.current.delete(remoteUserId)
    } else {
      let existing = remoteSelectionsRef.current.get(remoteUserId)
      if (!existing) {
        existing = { elementIds, colorIdx: remoteSelColorIdxRef.current++ }
      } else {
        existing = { ...existing, elementIds }
      }
      remoteSelectionsRef.current.set(remoteUserId, existing)
    }
    // Schedule render
    if (!renderRafRef.current) {
      renderRafRef.current = requestAnimationFrame(() => {
        renderRafRef.current = 0
        render()
      })
    }
  }, [render])

  // Remote draw-progress: show other user's drawing in realtime (single element)
  const setRemoteDrawing = useCallback((userId: string, element: BoardElement) => {
    let userMap = remoteDrawingsRef.current.get(userId)
    if (!userMap) {
      userMap = new Map()
      remoteDrawingsRef.current.set(userId, userMap)
    }
    userMap.set(element.id, element)
    // Batch render with rAF
    if (!renderRafRef.current) {
      renderRafRef.current = requestAnimationFrame(() => {
        renderRafRef.current = 0
        render()
      })
    }
  }, [render])

  // Remote move-progress: store offsets directly, render via canvas translate
  const setRemoteMoveDelta = useCallback((_userId: string, elementIds: string[], dx: number, dy: number) => {
    for (const id of elementIds) {
      remoteMoveOffsetsRef.current.set(id, { dx, dy })
    }
    // Schedule render
    if (!renderRafRef.current) {
      renderRafRef.current = requestAnimationFrame(() => {
        renderRafRef.current = 0
        render()
      })
    }
  }, [render])

  // Remote resize-progress: compute resize previews from handle + delta
  const remoteResizePreviewRef = useRef<Map<string, BoardElement>>(new Map())

  const setRemoteResizeDelta = useCallback((_userId: string, elementIds: string[], handle: string, dx: number, dy: number, originalBounds: { x: number; y: number; w: number; h: number }) => {
    // Handle endpoint drags for lines/arrows
    if (handle === 'start' || handle === 'end') {
      for (const id of elementIds) {
        const el = elementsRef.current.find(e => e.id === id)
        if (el) {
          remoteResizePreviewRef.current.set(id, moveEndpoint(el, handle as EndpointHandle, dx, dy))
        }
      }
    } else {
      const newBounds = computeResizedBounds(originalBounds, handle as ResizeHandle, dx, dy)
      for (const id of elementIds) {
        const el = elementsRef.current.find(e => e.id === id)
        if (el) {
          remoteResizePreviewRef.current.set(id, resizeElement(el, originalBounds, newBounds))
        }
      }
    }
    // Schedule render
    if (!renderRafRef.current) {
      renderRafRef.current = requestAnimationFrame(() => {
        renderRafRef.current = 0
        render()
      })
    }
  }, [render])

  const clearRemoteDrawing = useCallback((userId: string) => {
    remoteDrawingsRef.current.delete(userId)
    if (!renderRafRef.current) {
      renderRafRef.current = requestAnimationFrame(() => {
        renderRafRef.current = 0
        render()
      })
    }
  }, [render])

  // ========== Thumbnail generation ==========

  const generateThumbnail = useCallback((): string | null => {
    if (elements.length === 0) return null

    // Compute bounding box of all elements in world coords
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const el of elements) {
      switch (el.type) {
        case 'pen':
        case 'highlight':
          for (const [px, py] of el.data.points) {
            const pad = el.data.style.width / 2
            if (px - pad < minX) minX = px - pad
            if (py - pad < minY) minY = py - pad
            if (px + pad > maxX) maxX = px + pad
            if (py + pad > maxY) maxY = py + pad
          }
          break
        case 'rect':
          minX = Math.min(minX, el.data.x, el.data.x + el.data.width)
          minY = Math.min(minY, el.data.y, el.data.y + el.data.height)
          maxX = Math.max(maxX, el.data.x, el.data.x + el.data.width)
          maxY = Math.max(maxY, el.data.y, el.data.y + el.data.height)
          break
        case 'circle':
          minX = Math.min(minX, el.data.cx - Math.abs(el.data.rx))
          minY = Math.min(minY, el.data.cy - Math.abs(el.data.ry))
          maxX = Math.max(maxX, el.data.cx + Math.abs(el.data.rx))
          maxY = Math.max(maxY, el.data.cy + Math.abs(el.data.ry))
          break
        case 'line':
          minX = Math.min(minX, el.data.x1, el.data.x2)
          minY = Math.min(minY, el.data.y1, el.data.y2)
          maxX = Math.max(maxX, el.data.x1, el.data.x2)
          maxY = Math.max(maxY, el.data.y1, el.data.y2)
          break
        case 'text':
          minX = Math.min(minX, el.data.x)
          minY = Math.min(minY, el.data.y)
          maxX = Math.max(maxX, el.data.x + el.data.width)
          maxY = Math.max(maxY, el.data.y + el.data.height)
          break
        case 'image':
          minX = Math.min(minX, el.data.x)
          minY = Math.min(minY, el.data.y)
          maxX = Math.max(maxX, el.data.x + el.data.width)
          maxY = Math.max(maxY, el.data.y + el.data.height)
          break
      }
    }

    if (!isFinite(minX) || !isFinite(minY)) return null

    // Add padding
    const pad = 20
    minX -= pad
    minY -= pad
    maxX += pad
    maxY += pad

    const worldW = maxX - minX
    const worldH = maxY - minY
    if (worldW <= 0 || worldH <= 0) return null

    // Thumbnail dimensions
    const THUMB_W = 480
    const THUMB_H = 300
    const scale = Math.min(THUMB_W / worldW, THUMB_H / worldH)
    const renderW = Math.ceil(worldW * scale)
    const renderH = Math.ceil(worldH * scale)

    const offscreen = document.createElement('canvas')
    offscreen.width = renderW
    offscreen.height = renderH
    const ctx = offscreen.getContext('2d')
    if (!ctx) return null

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, renderW, renderH)

    // Transform: scale and translate so bounding box fits
    ctx.save()
    ctx.scale(scale, scale)
    ctx.translate(-minX, -minY)

    elements.forEach((el) => drawElement(ctx, el, imageCacheRef.current))

    ctx.restore()

    return offscreen.toDataURL('image/jpeg', 0.7)
  }, [elements])

  return {
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
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    selectedIds,
    selectionCursor,
    deleteSelected,
    duplicateSelected,
    getSelectionScreenBounds,
    addRemoteElement,
    updateRemoteElement,
    removeRemoteElements,
    setRemoteDrawing,
    setRemoteMoveDelta,
    setRemoteResizeDelta,
    setRemoteSelection,
    clearRemoteDrawing,
    render,
    zoomIn,
    zoomOut,
    zoomReset,
    addImageElement,
    screenToWorld,
    generateThumbnail,
    getElements: useCallback(() => elementsRef.current, []),
  }
}
