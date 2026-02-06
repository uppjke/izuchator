'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
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
  type LucideIcon,
} from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BoardTool, CanvasState } from './types'

// ============================================================================
// Конфигурация инструментов
// ============================================================================

interface ToolConfig {
  id: BoardTool
  icon: LucideIcon
  label: string
  shortcut?: string
}

const tools: ToolConfig[] = [
  { id: 'select', icon: MousePointer2, label: 'Выделение', shortcut: 'V' },
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

// ============================================================================
// Toolbar Component
// ============================================================================

interface BoardToolbarProps {
  state: CanvasState
  onChange: (updates: Partial<CanvasState>) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canUndo: boolean
  canRedo: boolean
  className?: string
}

export function BoardToolbar({
  state,
  onChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  className,
}: BoardToolbarProps) {
  const selectTool = useCallback(
    (tool: BoardTool) => onChange({ tool }),
    [onChange]
  )

  return (
    <div className={cn(
      'flex items-center gap-1 bg-white/95 backdrop-blur-xl rounded-2xl',
      'shadow-lg border border-zinc-200/50 p-1.5',
      className
    )}>
      {/* Инструменты */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => selectTool(tool.id)}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            className={cn(
              'relative p-2 rounded-xl transition-all duration-150',
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
            {state.tool === tool.id && (
              <motion.div
                layoutId="activeTool"
                className="absolute inset-0 bg-zinc-900 rounded-xl -z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Разделитель */}
      <div className="w-px h-8 bg-zinc-200 mx-1" />

      {/* Цвета */}
      <div className="flex items-center gap-1">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange({ strokeColor: color })}
            title={color}
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-all duration-150',
              'hover:scale-110 active:scale-95',
              state.strokeColor === color
                ? 'border-zinc-900 ring-2 ring-zinc-900/20'
                : 'border-zinc-300'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Разделитель */}
      <div className="w-px h-8 bg-zinc-200 mx-1" />

      {/* Толщина линии */}
      <div className="flex items-center gap-0.5">
        {STROKE_WIDTHS.map((width) => (
          <button
            key={width}
            onClick={() => onChange({ strokeWidth: width })}
            title={`${width}px`}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              'hover:bg-zinc-100 active:scale-95',
              state.strokeWidth === width && 'bg-zinc-100 ring-1 ring-zinc-300'
            )}
          >
            <div
              className="rounded-full bg-current"
              style={{
                width: Math.min(width * 1.5 + 2, 20),
                height: Math.min(width * 1.5 + 2, 20),
                color: state.strokeColor,
              }}
            />
          </button>
        ))}
      </div>

      {/* Разделитель */}
      <div className="w-px h-8 bg-zinc-200 mx-1" />

      {/* Undo/Redo/Clear */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-8 w-8 rounded-xl"
          title="Отменить (Ctrl+Z)"
        >
          <Icon icon={Undo2} size="sm" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-8 w-8 rounded-xl"
          title="Повторить (Ctrl+Shift+Z)"
        >
          <Icon icon={Redo2} size="sm" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-8 w-8 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
          title="Очистить доску"
        >
          <Icon icon={Trash2} size="sm" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Mobile Toolbar (компактный, внизу экрана)
// ============================================================================

interface MobileToolbarProps {
  state: CanvasState
  onChange: (updates: Partial<CanvasState>) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function MobileToolbar({
  state,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: MobileToolbarProps) {
  // На мобильных — показываем основные инструменты в ряд
  const mobileTools = tools.filter(t =>
    ['pen', 'highlight', 'text', 'eraser', 'rect', 'image'].includes(t.id)
  )

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-zinc-200/50 pb-[env(safe-area-inset-bottom)]">
      {/* Цвета - горизонтальный скролл */}
      <div className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto scrollbar-hide">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange({ strokeColor: color })}
            className={cn(
              'w-7 h-7 rounded-full border-2 flex-shrink-0 transition-all',
              state.strokeColor === color
                ? 'border-zinc-900 scale-110'
                : 'border-zinc-300'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        <div className="w-px h-5 bg-zinc-200 flex-shrink-0 mx-1" />
        {STROKE_WIDTHS.slice(0, 3).map((width) => (
          <button
            key={width}
            onClick={() => onChange({ strokeWidth: width })}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
              state.strokeWidth === width && 'bg-zinc-100 ring-1 ring-zinc-300'
            )}
          >
            <div
              className="rounded-full"
              style={{
                width: Math.min(width * 2 + 2, 16),
                height: Math.min(width * 2 + 2, 16),
                backgroundColor: state.strokeColor,
              }}
            />
          </button>
        ))}
      </div>

      {/* Инструменты */}
      <div className="flex items-center justify-around px-2 py-1.5">
        {mobileTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onChange({ tool: tool.id })}
            className={cn(
              'flex flex-col items-center gap-0.5 p-1.5 rounded-xl min-w-[48px]',
              'transition-all active:scale-95',
              state.tool === tool.id
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600'
            )}
          >
            <Icon icon={tool.icon} size="sm" />
            <span className="text-[9px] font-medium">{tool.label}</span>
          </button>
        ))}
        <div className="w-px h-8 bg-zinc-200" />
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-xl text-zinc-600 disabled:opacity-30"
        >
          <Icon icon={Undo2} size="sm" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-xl text-zinc-600 disabled:opacity-30"
        >
          <Icon icon={Redo2} size="sm" />
        </button>
      </div>
    </div>
  )
}
