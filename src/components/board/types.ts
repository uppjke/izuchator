// ============================================================================
// Типы для доски уроков
// ============================================================================

// Инструменты доски
export type BoardTool = 'select' | 'pen' | 'highlight' | 'text' | 'rect' | 'circle' | 'line' | 'eraser' | 'image'

// Стиль линии
export interface StrokeStyle {
  color: string
  width: number
  opacity: number
}

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
export type BoardElement = PenElement | TextElement | RectElement | CircleElement | LineElement | ImageElement

// Настройки доски
export interface BoardSettings {
  background: string
  gridEnabled: boolean
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
  'board:join': (data: { boardId: string; userId: string }) => void
  'board:leave': (data: { boardId: string }) => void
  'board:draw': (data: { boardId: string; element: BoardElement }) => void
  'board:erase': (data: { boardId: string; elementIds: string[] }) => void
  'board:cursor': (data: { boardId: string; x: number; y: number; userId: string }) => void
  'board:clear': (data: { boardId: string }) => void
  'board:undo': (data: { boardId: string; elementId: string }) => void
}

export interface BoardServerToClientEvents {
  'board:draw': (data: { element: BoardElement; userId: string }) => void
  'board:erase': (data: { elementIds: string[]; userId: string }) => void
  'board:cursor': (data: { x: number; y: number; userId: string; userName: string }) => void
  'board:user-joined': (data: { userId: string; userName: string }) => void
  'board:user-left': (data: { userId: string }) => void
  'board:clear': (data: { userId: string }) => void
  'board:undo': (data: { elementId: string; userId: string }) => void
  'board:users': (data: { users: Array<{ userId: string; userName: string }> }) => void
}

// Состояние холста
export interface CanvasState {
  tool: BoardTool
  strokeColor: string
  strokeWidth: number
  fillColor: string | null
  opacity: number
  fontSize: number
}

export const DEFAULT_CANVAS_STATE: CanvasState = {
  tool: 'pen',
  strokeColor: '#1a1a1a',
  strokeWidth: 2,
  fillColor: null,
  opacity: 1,
  fontSize: 16,
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
  line: 'Линия',
  eraser: 'Ластик',
  image: 'Изображение',
}
