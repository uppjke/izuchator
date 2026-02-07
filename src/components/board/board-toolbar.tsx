'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Pencil,
  Type,
  Square,
  Circle,
  Minus,
  Eraser,
  Highlighter,
  ImagePlus,
  Undo2,
  Redo2,
  Trash2,
  MousePointer2,
  Hand,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { BoardTool, CanvasState, GridType } from './types'

// ============================================================================
// Конфигурация
// ============================================================================

interface ToolConfig {
  id: BoardTool
  icon: LucideIcon
  label: string
  shortcut?: string
}

const DRAWING_TOOLS: ToolConfig[] = [
  { id: 'select', icon: MousePointer2, label: 'Выделение', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Перемещение', shortcut: 'Space' },
  { id: 'pen', icon: Pencil, label: 'Карандаш', shortcut: 'P' },
  { id: 'highlight', icon: Highlighter, label: 'Выделитель', shortcut: 'H' },
  { id: 'text', icon: Type, label: 'Текст', shortcut: 'T' },
  { id: 'rect', icon: Square, label: 'Прямоугольник', shortcut: 'R' },
  { id: 'circle', icon: Circle, label: 'Круг', shortcut: 'C' },
  { id: 'line', icon: Minus, label: 'Линия', shortcut: 'L' },
  { id: 'eraser', icon: Eraser, label: 'Ластик', shortcut: 'E' },
  { id: 'image', icon: ImagePlus, label: 'Изображение', shortcut: 'I' },
]

const PRESET_COLORS = [
  '#1a1a1a', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff',
]

const STROKE_WIDTHS = [1, 2, 4, 8, 16]

const GRID_OPTIONS: { id: GridType; label: string }[] = [
  { id: 'none', label: 'Нет' },
  { id: 'dots', label: 'Точки' },
  { id: 'lines', label: 'Линии' },
  { id: 'squares', label: 'Клетки' },
]

// ============================================================================
// Floating Toolbar — единый компонент для всех экранов
// ============================================================================

interface FloatingToolbarProps {
  state: CanvasState
  onChange: (updates: Partial<CanvasState>) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canUndo: boolean
  canRedo: boolean
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

type PanelType = 'colors' | 'grid' | null

export function FloatingToolbar({
  state,
  onChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: FloatingToolbarProps) {
  const [openPanel, setOpenPanel] = useState<PanelType>(null)

  const selectTool = useCallback(
    (tool: BoardTool) => {
      onChange({ tool })
      setOpenPanel(null)
    },
    [onChange]
  )

  const togglePanel = useCallback((panel: PanelType) => {
    setOpenPanel(prev => (prev === panel ? null : panel))
  }, [])

  // ---- Shared sub-components ----

  const renderToolButton = (tool: ToolConfig) => (
    <button
      key={tool.id}
      onClick={() => selectTool(tool.id)}
      title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      className={cn(
        'relative p-2 rounded-xl transition-all duration-150 flex-shrink-0',
        'hover:bg-zinc-100 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900',
        state.tool === tool.id && 'bg-zinc-900 text-white hover:bg-zinc-800'
      )}
    >
      <Icon
        icon={tool.icon}
        size="sm"
        className={state.tool === tool.id ? 'text-white' : 'text-zinc-700'}
      />
    </button>
  )

  const separator = (
    <div className="w-px h-7 bg-zinc-200 mx-0.5 flex-shrink-0" />
  )

  const colorButton = (
    <button
      onClick={() => togglePanel('colors')}
      title="Цвет и толщина"
      className={cn(
        'p-2 rounded-xl transition-all duration-150 flex-shrink-0',
        'hover:bg-zinc-100 active:scale-95',
        openPanel === 'colors' && 'bg-zinc-100'
      )}
    >
      <div className="flex items-center gap-1">
        <div
          className="w-4 h-4 rounded-full border border-zinc-300"
          style={{ backgroundColor: state.strokeColor }}
        />
        <Icon
          icon={ChevronUp}
          size="xs"
          className={cn(
            'text-zinc-400 transition-transform',
            openPanel === 'colors' && 'rotate-180'
          )}
        />
      </div>
    </button>
  )

  const gridButton = (
    <button
      onClick={() => togglePanel('grid')}
      title="Сетка"
      className={cn(
        'p-2 rounded-xl transition-all duration-150 flex-shrink-0',
        'hover:bg-zinc-100 active:scale-95',
        openPanel === 'grid' && 'bg-zinc-100',
        state.gridType !== 'none' && 'text-blue-600'
      )}
    >
      <Icon icon={Grid3x3} size="sm" />
    </button>
  )

  const undoRedoClearButtons = (
    <>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Отменить (Ctrl+Z)"
        className="p-2 rounded-xl transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-30 flex-shrink-0"
      >
        <Icon icon={Undo2} size="sm" className="text-zinc-700" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Повторить (Ctrl+Shift+Z)"
        className="p-2 rounded-xl transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-30 flex-shrink-0"
      >
        <Icon icon={Redo2} size="sm" className="text-zinc-700" />
      </button>
      <button
        onClick={onClear}
        title="Очистить доску"
        className="p-2 rounded-xl transition-all hover:bg-red-50 active:scale-95 flex-shrink-0"
      >
        <Icon icon={Trash2} size="sm" className="text-red-500" />
      </button>
    </>
  )

  // ---- Expandable panels ----

  const colorPanel = openPanel === 'colors' && (
    <motion.div
      key="colors"
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-3 flex flex-col gap-3 pointer-events-auto"
    >
      {/* Colors */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange({ strokeColor: color })}
            title={color}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-all duration-150',
              'hover:scale-110 active:scale-95',
              state.strokeColor === color
                ? 'border-zinc-900 ring-2 ring-zinc-900/20 scale-110'
                : 'border-zinc-200'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      {/* Stroke widths */}
      <div className="flex items-center gap-1 justify-center">
        {STROKE_WIDTHS.map((width) => (
          <button
            key={width}
            onClick={() => onChange({ strokeWidth: width })}
            title={`${width}px`}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
              'hover:bg-zinc-100 active:scale-95',
              state.strokeWidth === width && 'bg-zinc-100 ring-1 ring-zinc-300'
            )}
          >
            <div
              className="rounded-full"
              style={{
                width: Math.min(width * 1.5 + 2, 20),
                height: Math.min(width * 1.5 + 2, 20),
                backgroundColor: state.strokeColor,
              }}
            />
          </button>
        ))}
      </div>
    </motion.div>
  )

  const gridPanel = openPanel === 'grid' && (
    <motion.div
      key="grid"
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-2 flex items-center gap-1 pointer-events-auto"
    >
      {GRID_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange({ gridType: opt.id })}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
            'hover:bg-zinc-100 active:scale-95',
            state.gridType === opt.id
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600'
          )}
        >
          {opt.label}
        </button>
      ))}
    </motion.div>
  )

  return (
    <>
      {/* ========== Main toolbar area — bottom center ========== */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
      >
        <div className="flex flex-col items-center gap-1.5 w-full px-3">
          {/* Expandable panels */}
          <AnimatePresence>
            {colorPanel}
            {gridPanel}
          </AnimatePresence>

          {/* ---- Desktop: single-row pill (sm+) ---- */}
          <div className="hidden sm:flex pointer-events-auto items-center gap-0.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1">
            <div className="flex items-center gap-0.5">
              {DRAWING_TOOLS.map(renderToolButton)}
            </div>
            {separator}
            {colorButton}
            {gridButton}
            {separator}
            {undoRedoClearButtons}
          </div>

          {/* ---- Mobile: two-row stacked layout (<sm) ---- */}
          <div className="flex sm:hidden flex-col items-center gap-1 pointer-events-auto w-full">
            {/* Row 1: Drawing tools — horizontal scroll */}
            <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1 overflow-x-auto scrollbar-hide max-w-full">
              {DRAWING_TOOLS.map(renderToolButton)}
            </div>

            {/* Row 2: Color, grid, undo/redo, clear */}
            <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1">
              {colorButton}
              {gridButton}
              {separator}
              {undoRedoClearButtons}
            </div>
          </div>
        </div>
      </div>

      {/* ========== Zoom controls — separate floating pill ========== */}
      <div
        className="fixed z-50 right-3 flex flex-col items-center gap-0.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1 pointer-events-auto bottom-28 sm:bottom-20"
      >
        <button
          onClick={onZoomIn}
          title="Приблизить"
          className="p-1.5 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all"
        >
          <Icon icon={ZoomIn} size="sm" className="text-zinc-700" />
        </button>
        <button
          onClick={onZoomReset}
          title="Сбросить масштаб"
          className="px-1.5 py-0.5 rounded-lg hover:bg-zinc-100 active:scale-95 transition-all min-w-[36px] text-center"
        >
          <span className="text-[10px] font-medium text-zinc-600">
            {Math.round(scale * 100)}%
          </span>
        </button>
        <button
          onClick={onZoomOut}
          title="Отдалить"
          className="p-1.5 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all"
        >
          <Icon icon={ZoomOut} size="sm" className="text-zinc-700" />
        </button>
        <button
          onClick={onZoomReset}
          title="По размеру экрана"
          className="p-1.5 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all"
        >
          <Icon icon={Maximize} size="xs" className="text-zinc-700" />
        </button>
      </div>
    </>
  )
}
