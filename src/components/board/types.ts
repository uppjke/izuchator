// ============================================================================
// Типы для доски уроков
// ============================================================================

// Инструменты доски
export type BoardTool = 'select' | 'pen' | 'highlight' | 'text' | 'rect' | 'circle' | 'triangle' | 'line' | 'arrow' | 'eraser' | 'image' | 'pan'

// Тип сетки
export type GridType = 'none' | 'dots' | 'lines' | 'squares'

// Стиль линии
export interface StrokeStyle {
  color: string
  width: number
  opacity: number
}

// ============================================================================
// Viewport — масштабирование и панорамирование
// ============================================================================

export interface ViewportState {
  offsetX: number
  offsetY: number
  scale: number
}

export const DEFAULT_VIEWPORT: ViewportState = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
}

export const MIN_SCALE = 0.1
export const MAX_SCALE = 5
export const ZOOM_STEP = 0.1

// Базовый элемент доски
export interface BoardElementBase {
  id: string
  type: BoardTool
  zIndex: number
  createdBy: string
  createdAt?: string
}

// Рисование от руки (карандаш / выделитель)
export interface PenElement extends BoardElementBase {
  type: 'pen' | 'highlight'
  data: {
    points: [number, number][] // [[x, y], ...]
    style: StrokeStyle
  }
}

// Текст
export interface TextElement extends BoardElementBase {
  type: 'text'
  data: {
    x: number
    y: number
    width: number
    height: number
    content: string
    fontSize: number
    fontFamily: string
    color: string
    bold: boolean
    italic: boolean
  }
}

// Прямоугольник
export interface RectElement extends BoardElementBase {
  type: 'rect'
  data: {
    x: number
    y: number
    width: number
    height: number
    style: StrokeStyle
    fill?: string
  }
}

// Круг / эллипс
export interface CircleElement extends BoardElementBase {
  type: 'circle'
  data: {
    cx: number
    cy: number
    rx: number
    ry: number
    style: StrokeStyle
    fill?: string
  }
}

// Линия
export interface LineElement extends BoardElementBase {
  type: 'line'
  data: {
    x1: number
    y1: number
    x2: number
    y2: number
    style: StrokeStyle
  }
}

// Стрелка
export interface ArrowElement extends BoardElementBase {
  type: 'arrow'
  data: {
    x1: number
    y1: number
    x2: number
    y2: number
    style: StrokeStyle
  }
}

// Треугольник
export interface TriangleElement extends BoardElementBase {
  type: 'triangle'
  data: {
    x: number
    y: number
    width: number
    height: number
    style: StrokeStyle
    fill?: string
  }
}

// Изображение
export interface ImageElement extends BoardElementBase {
  type: 'image'
  data: {
    x: number
    y: number
    width: number
    height: number
    src: string // base64 или URL
  }
}

// Ластик (хранится как удалённые ID)
export interface EraserAction {
  type: 'eraser'
  deletedIds: string[]
}

// Объединённый тип элемента
export type BoardElement = PenElement | TextElement | RectElement | CircleElement | TriangleElement | LineElement | ArrowElement | ImageElement

// Настройки доски
export interface BoardSettings {
  background: string
  gridEnabled: boolean
  gridType?: GridType
}

// Данные доски
export interface BoardData {
  id: string
  title: string
  teacherId: string
  relationId: string | null
  settings: BoardSettings
  thumbnail: string | null
  createdAt: string
  updatedAt: string
  teacher?: {
    id: string
    name: string | null
    email: string
  }
  relation?: {
    id: string
    student: { id: string; name: string | null; email: string }
    teacher: { id: string; name: string | null; email: string }
  } | null
  elements: BoardElement[]
  _count?: { elements: number }
}

// Список досок (без элементов)
export interface BoardListItem {
  id: string
  title: string
  teacherId: string
  relationId: string | null
  settings: BoardSettings
  thumbnail: string | null
  createdAt: string
  updatedAt: string
  teacher?: {
    id: string
    name: string | null
    email: string
  }
  relation?: {
    id: string
    student: { id: string; name: string | null; email: string }
    teacher?: { id: string; name: string | null; email: string }
  } | null
  _count: { elements: number }
}

// ============================================================================
// Socket.io события для real-time доски
// ============================================================================

export interface BoardClientToServerEvents {
  'board:join': (data: { boardId: string; userId: string; userName: string }) => void
  'board:leave': (data: { boardId: string }) => void
  'board:draw': (data: { boardId: string; element: BoardElement }) => void
  'board:draw-progress': (data: { boardId: string; element: BoardElement }) => void
  'board:move-batch': (data: { boardId: string; elements: BoardElement[] }) => void
  'board:move-delta': (data: { boardId: string; elementIds: string[]; dx: number; dy: number }) => void
  'board:resize-delta': (data: { boardId: string; elementIds: string[]; handle: string; dx: number; dy: number; originalBounds: { x: number; y: number; w: number; h: number } }) => void
  'board:erase': (data: { boardId: string; elementIds: string[] }) => void
  'board:cursor': (data: { boardId: string; x: number; y: number; userId: string }) => void
  'board:select': (data: { boardId: string; elementIds: string[] }) => void
  'board:clear': (data: { boardId: string }) => void
  'board:undo': (data: { boardId: string; elementId: string }) => void
  'board:state-response': (data: { boardId: string; requesterId: string; elements: BoardElement[] }) => void
  // WebRTC signaling
  'board:rtc-offer': (data: { boardId: string; targetUserId: string; offer: RTCSessionDescriptionInit }) => void
  'board:rtc-answer': (data: { boardId: string; targetUserId: string; answer: RTCSessionDescriptionInit }) => void
  'board:rtc-ice-candidate': (data: { boardId: string; targetUserId: string; candidate: RTCIceCandidateInit }) => void
  'board:rtc-hangup': (data: { boardId: string }) => void
  'board:rtc-ready': (data: { boardId: string }) => void
}

export interface BoardServerToClientEvents {
  'board:draw': (data: { element: BoardElement; userId: string }) => void
  'board:draw-progress': (data: { element: BoardElement; userId: string }) => void
  'board:move-batch': (data: { elements: BoardElement[]; userId: string }) => void
  'board:move-delta': (data: { elementIds: string[]; dx: number; dy: number; userId: string }) => void
  'board:resize-delta': (data: { elementIds: string[]; handle: string; dx: number; dy: number; originalBounds: { x: number; y: number; w: number; h: number }; userId: string }) => void
  'board:erase': (data: { elementIds: string[]; userId: string }) => void
  'board:cursor': (data: { x: number; y: number; userId: string; userName: string }) => void
  'board:select': (data: { elementIds: string[]; userId: string }) => void
  'board:user-joined': (data: { userId: string; userName: string }) => void
  'board:user-left': (data: { userId: string }) => void
  'board:clear': (data: { userId: string }) => void
  'board:undo': (data: { elementId: string; userId: string }) => void
  'board:users': (data: { users: Array<{ userId: string; userName: string }> }) => void
  'board:request-state': (data: { requesterId: string }) => void
  'board:sync-state': (data: { elements: BoardElement[] }) => void
  // WebRTC signaling
  'board:rtc-offer': (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => void
  'board:rtc-answer': (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => void
  'board:rtc-ice-candidate': (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => void
  'board:rtc-hangup': (data: { fromUserId: string }) => void
  'board:rtc-ready': (data: { fromUserId: string }) => void
}

// Состояние холста

// Инструменты, которые используют цвет
export const TOOLS_WITH_COLOR: BoardTool[] = ['pen', 'highlight', 'text', 'rect', 'circle', 'triangle', 'line', 'arrow']

export interface CanvasState {
  tool: BoardTool
  strokeColor: string
  strokeWidth: number
  fillColor: string | null
  opacity: number
  fontSize: number
  gridType: GridType
  toolColors: Record<string, string>
}

export const DEFAULT_TOOL_COLORS: Record<string, string> = {
  pen: '#1a1a1a',
  highlight: '#fde047',
  text: '#1a1a1a',
  rect: '#3b82f6',
  circle: '#22c55e',
  triangle: '#f97316',
  line: '#1a1a1a',
  arrow: '#1a1a1a',
}

export const DEFAULT_CANVAS_STATE: CanvasState = {
  tool: 'pen',
  strokeColor: '#1a1a1a',
  strokeWidth: 2,
  fillColor: null,
  opacity: 1,
  fontSize: 16,
  gridType: 'dots',
  toolColors: { ...DEFAULT_TOOL_COLORS },
}

export const HIGHLIGHT_DEFAULTS = {
  color: '#fde047',
  width: 20,
  opacity: 0.4,
}

export const TOOL_LABELS: Record<BoardTool, string> = {
  select: 'Выделение',
  pen: 'Карандаш',
  highlight: 'Выделитель',
  text: 'Текст',
  rect: 'Прямоугольник',
  circle: 'Круг',
  triangle: 'Треугольник',
  line: 'Линия',
  arrow: 'Стрелка',
  eraser: 'Ластик',
  image: 'Изображение',
  pan: 'Перемещение',
}

export const GRID_LABELS: Record<GridType, string> = {
  none: 'Нет',
  dots: 'Точки',
  lines: 'Линии',
  squares: 'Клетки',
}
