'use client'

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Pencil,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  MoveRight,
  Eraser,
  Highlighter,
  ImagePlus,
  Undo2,
  Redo2,
  Trash2,
  MousePointer2,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Grid3x3,
  Rows3,
  GripHorizontal,
  SquareSlash,
  type LucideIcon,
} from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { BoardTool, CanvasState, GridType } from './types'
import { TOOLS_WITH_COLOR } from './types'

// ============================================================================
// Конфигурация
// ============================================================================

interface ToolConfig {
  id: BoardTool
  icon: LucideIcon
  label: string
  shortcut?: string
}

const TOOLS_BEFORE_SHAPES: ToolConfig[] = [
  { id: 'select', icon: MousePointer2, label: 'Выделение', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Перемещение', shortcut: 'Space' },
  { id: 'pen', icon: Pencil, label: 'Карандаш', shortcut: 'P' },
  { id: 'highlight', icon: Highlighter, label: 'Выделитель', shortcut: 'H' },
  { id: 'text', icon: Type, label: 'Текст', shortcut: 'T' },
]

const TOOLS_AFTER_SHAPES: ToolConfig[] = [
  { id: 'eraser', icon: Eraser, label: 'Ластик', shortcut: 'E' },
  { id: 'image', icon: ImagePlus, label: 'Изображение', shortcut: 'I' },
]

const SHAPE_TOOLS: ToolConfig[] = [
  { id: 'rect', icon: Square, label: 'Прямоугольник', shortcut: 'R' },
  { id: 'circle', icon: Circle, label: 'Круг', shortcut: 'C' },
  { id: 'triangle', icon: Triangle, label: 'Треугольник' },
  { id: 'line', icon: Minus, label: 'Линия', shortcut: 'L' },
  { id: 'arrow', icon: MoveRight, label: 'Стрелка' },
]

const SHAPE_TOOL_IDS = SHAPE_TOOLS.map(t => t.id)

const PRESET_COLORS = [
  '#1a1a1a', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff',
]

const STROKE_WIDTHS = [1, 2, 4, 8, 16]

const GRID_OPTIONS: { id: GridType; label: string; icon: LucideIcon }[] = [
  { id: 'none', label: 'Нет', icon: SquareSlash },
  { id: 'dots', label: 'Точки', icon: GripHorizontal },
  { id: 'lines', label: 'Линии', icon: Rows3 },
  { id: 'squares', label: 'Клетки', icon: Grid3x3 },
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

type PanelType = 'colors' | 'more' | 'grid' | 'shapes' | 'shapeColors' | null

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
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom')
  const isTop = position === 'top'

  // Track last-used shape for grouped shape button
  const [lastActiveShape, setLastActiveShape] = useState<BoardTool>('rect')
  const isShapeTool = SHAPE_TOOL_IDS.includes(state.tool)

  useEffect(() => {
    if (isShapeTool) setLastActiveShape(state.tool)
  }, [state.tool, isShapeTool])

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

  // Helper: get color for a specific tool
  const getToolColor = useCallback(
    (toolId: BoardTool) => state.toolColors[toolId] ?? state.strokeColor,
    [state.toolColors, state.strokeColor]
  )

  const hasColor = useCallback(
    (toolId: BoardTool) => TOOLS_WITH_COLOR.includes(toolId),
    []
  )

  // ---- Shared sub-components ----

  /** Tools that show their color as the active button background (excludes text) */
  const showsActiveColor = useCallback(
    (toolId: BoardTool) => hasColor(toolId) && toolId !== 'text',
    [hasColor]
  )

  /** Tools that open a color sub-panel on re-click */
  const hasColorPanel = useCallback(
    (toolId: BoardTool) => toolId === 'pen' || toolId === 'highlight',
    []
  )

  const renderToolButton = (tool: ToolConfig) => {
    const isActive = state.tool === tool.id
    const activeColor = showsActiveColor(tool.id) ? getToolColor(tool.id) : undefined
    return (
      <button
        key={tool.id}
        onClick={() => {
          if (isActive && hasColorPanel(tool.id)) {
            togglePanel('colors')
          } else {
            selectTool(tool.id)
          }
        }}
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        className={cn(
          'relative p-2 rounded-xl transition-all duration-150 flex-shrink-0',
          'hover:bg-zinc-100 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900',
          isActive && !activeColor && 'bg-zinc-900 text-white hover:bg-zinc-800',
          isActive && activeColor && 'text-white'
        )}
        style={isActive && activeColor ? { backgroundColor: activeColor } : undefined}
      >
        <Icon
          icon={tool.icon}
          size="sm"
          className={isActive ? 'text-white' : 'text-zinc-700'}
        />
      </button>
    )
  }

  const separator = (
    <div className="w-px h-7 bg-zinc-200 mx-0.5 flex-shrink-0" />
  )

  const undoRedoButtons = (
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
    </>
  )

  const moreButton = (
    <button
      onClick={() => togglePanel('more')}
      title="Ещё"
      className={cn(
        'p-2 rounded-xl transition-all duration-150 flex-shrink-0',
        'hover:bg-zinc-100 active:scale-95',
        openPanel === 'more' && 'bg-zinc-100'
      )}
    >
      <Icon icon={MoreHorizontal} size="sm" className="text-zinc-700" />
    </button>
  )

  // ---- Expandable panels ----

  const currentToolColor = hasColor(state.tool) ? getToolColor(state.tool) : state.strokeColor

  const panelY = isTop ? -8 : 8

  const colorPanel = openPanel === 'colors' && (state.tool === 'pen' || state.tool === 'highlight') && (
    <motion.div
      key="colors"
      initial={{ opacity: 0, y: panelY, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: panelY, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-2 flex flex-col gap-1.5 pointer-events-auto"
    >
      <div className="flex items-center gap-1.5 justify-center">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              onChange({ toolColors: { ...state.toolColors, [state.tool]: color } })
            }}
            title={color}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-all duration-150',
              'hover:scale-110 active:scale-95',
              currentToolColor === color
                ? 'border-zinc-900 ring-2 ring-zinc-900/20 scale-110'
                : 'border-zinc-200'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 justify-center">
        {STROKE_WIDTHS.map((width) => (
          <button
            key={width}
            onClick={() => onChange({ strokeWidth: width })}
            title={`${width}px`}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-all',
              'hover:bg-zinc-100 active:scale-95',
              state.strokeWidth === width && 'bg-zinc-100 ring-1 ring-zinc-300'
            )}
          >
            <div
              className="rounded-full"
              style={{
                width: Math.min(width * 1.5 + 2, 16),
                height: Math.min(width * 1.5 + 2, 16),
                backgroundColor: currentToolColor,
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
      initial={{ opacity: 0, y: panelY, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: panelY, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1 flex items-center gap-0.5 pointer-events-auto"
    >
      {GRID_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => {
            onChange({ gridType: opt.id })
            setOpenPanel('more')
          }}
          title={opt.label}
          className={cn(
            'p-2 rounded-xl transition-all',
            'hover:bg-zinc-100 active:scale-95',
            state.gridType === opt.id
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600'
          )}
        >
          <Icon icon={opt.icon} size="sm" className={state.gridType === opt.id ? 'text-white' : ''} />
        </button>
      ))}
    </motion.div>
  )

  const currentGridIcon = GRID_OPTIONS.find(o => o.id === state.gridType)?.icon ?? SquareSlash

  const morePanel = openPanel === 'more' && (
    <motion.div
      key="more"
      initial={{ opacity: 0, y: panelY, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: panelY, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1 flex items-center gap-0.5 pointer-events-auto"
    >
      {/* Grid — single button showing current grid, opens sub-panel */}
      <button
        onClick={() => setOpenPanel('grid')}
        title="Сетка"
        className={cn(
          'p-2 rounded-xl transition-all',
          'hover:bg-zinc-100 active:scale-95',
          state.gridType !== 'none' ? 'text-blue-600' : 'text-zinc-600'
        )}
      >
        <Icon icon={currentGridIcon} size="sm" />
      </button>
      {/* Position toggle */}
      <button
        onClick={() => {
          setPosition(prev => prev === 'bottom' ? 'top' : 'bottom')
          setOpenPanel(null)
        }}
        title={isTop ? 'Панель вниз' : 'Панель вверх'}
        className="p-2 rounded-xl transition-all hover:bg-zinc-100 active:scale-95"
      >
        <Icon icon={isTop ? ArrowDown : ArrowUp} size="sm" className="text-zinc-700" />
      </button>
      <div className="w-px h-7 bg-zinc-200 mx-0.5 flex-shrink-0" />
      {/* Clear board */}
      <button
        onClick={() => {
          onClear()
          setOpenPanel(null)
        }}
        title="Очистить доску"
        className="p-2 rounded-xl transition-all hover:bg-red-50 active:scale-95"
      >
        <Icon icon={Trash2} size="sm" className="text-red-500" />
      </button>
    </motion.div>
  )

  return (
    <>
      {/* ========== Main toolbar area ========== */}
      <div
        className={cn(
          'fixed inset-x-0 z-50 pointer-events-none flex items-center',
          isTop
            ? 'top-12 flex-col'
            : 'bottom-0 flex-col'
        )}
        style={isTop
          ? { paddingTop: '12px' }
          : { paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }
        }
      >
        <div className={cn(
          'flex items-center gap-1.5 w-full px-3',
          isTop ? 'flex-col-reverse' : 'flex-col'
        )}>
          {/* Expandable panels */}
          <AnimatePresence>
            {colorPanel}
            {gridPanel}
            {morePanel}
            {/* Shape colors sub-panel (3rd level — above shapes) */}
            {openPanel === 'shapeColors' && (
              <motion.div
                key="shapeColors"
                initial={{ opacity: 0, y: panelY, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: panelY, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-2 flex flex-col gap-1.5 pointer-events-auto"
              >
                <div className="flex items-center gap-1.5 justify-center">
                  {PRESET_COLORS.map((color) => {
                    const shapeColor = getToolColor(lastActiveShape)
                    return (
                      <button
                        key={color}
                        onClick={() => {
                          const newToolColors = { ...state.toolColors }
                          SHAPE_TOOL_IDS.forEach(id => { newToolColors[id] = color })
                          onChange({ toolColors: newToolColors })
                        }}
                        title={color}
                        className={cn(
                          'w-7 h-7 rounded-full border-2 transition-all duration-150',
                          'hover:scale-110 active:scale-95',
                          shapeColor === color
                            ? 'border-zinc-900 ring-2 ring-zinc-900/20 scale-110'
                            : 'border-zinc-200'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center gap-1 justify-center">
                  {STROKE_WIDTHS.map((width) => (
                    <button
                      key={width}
                      onClick={() => onChange({ strokeWidth: width })}
                      title={`${width}px`}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                        'hover:bg-zinc-100 active:scale-95',
                        state.strokeWidth === width && 'bg-zinc-100 ring-1 ring-zinc-300'
                      )}
                    >
                      <div
                        className="rounded-full"
                        style={{
                          width: Math.min(width * 1.5 + 2, 16),
                          height: Math.min(width * 1.5 + 2, 16),
                          backgroundColor: getToolColor(lastActiveShape),
                        }}
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {/* Shapes sub-panel (variants + color button) */}
            {(openPanel === 'shapes' || openPanel === 'shapeColors') && (
              <motion.div
                key="shapes"
                initial={{ opacity: 0, y: panelY, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: panelY, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1 flex items-center gap-0.5 pointer-events-auto"
              >
                {SHAPE_TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onChange({ tool: tool.id })
                    }}
                    title={tool.label}
                    className={cn(
                      'relative p-2 rounded-xl transition-all duration-150',
                      'hover:bg-zinc-100 active:scale-95',
                      state.tool === tool.id && 'text-white'
                    )}
                    style={state.tool === tool.id ? { backgroundColor: getToolColor(tool.id) } : undefined}
                  >
                    <Icon icon={tool.icon} size="sm" className={state.tool === tool.id ? 'text-white' : 'text-zinc-700'} />
                  </button>
                ))}
                <div className="w-px h-7 bg-zinc-200 mx-0.5" />
                <button
                  onClick={() => setOpenPanel(prev => prev === 'shapeColors' ? 'shapes' : 'shapeColors')}
                  title="Цвет и толщина фигур"
                  className={cn(
                    'p-2 rounded-xl transition-all duration-150',
                    'hover:bg-zinc-100 active:scale-95',
                    openPanel === 'shapeColors' && 'bg-zinc-100'
                  )}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-zinc-300"
                    style={{ backgroundColor: getToolColor(lastActiveShape) }}
                  />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---- Single-row pill (all devices) ---- */}
          <div className="flex pointer-events-auto items-center gap-0.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1 overflow-x-auto scrollbar-hide max-w-[calc(100vw-24px)]">
            <div className="flex items-center gap-0.5">
              {TOOLS_BEFORE_SHAPES.map(renderToolButton)}
              {/* Grouped shape button */}
              <button
                onClick={() => {
                  if (isShapeTool) {
                    togglePanel('shapes')
                  } else {
                    onChange({ tool: lastActiveShape })
                    setOpenPanel(null)
                  }
                }}
                title="Фигуры"
                className={cn(
                  'relative p-2 rounded-xl transition-all duration-150 flex-shrink-0',
                  'hover:bg-zinc-100 active:scale-95',
                  isShapeTool && 'text-white',
                  openPanel === 'shapes' && !isShapeTool && 'bg-zinc-100'
                )}
                style={isShapeTool ? { backgroundColor: getToolColor(lastActiveShape) } : undefined}
              >
                <Icon
                  icon={SHAPE_TOOLS.find(t => t.id === lastActiveShape)?.icon ?? Square}
                  size="sm"
                  className={isShapeTool ? 'text-white' : 'text-zinc-700'}
                />
              </button>
              {TOOLS_AFTER_SHAPES.map(renderToolButton)}
            </div>
            {separator}
            {undoRedoButtons}
            {separator}
            {moreButton}
          </div>
        </div>
      </div>

      {/* ========== Zoom controls — separate floating pill ========== */}
      <div
        className={cn(
          'fixed z-50 right-3 flex flex-col items-center gap-0.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/60 p-1 pointer-events-auto',
          isTop ? 'top-32' : 'bottom-20'
        )}
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
