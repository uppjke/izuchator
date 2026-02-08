/**
 * Типизация Socket.io событий для presence сервера
 * Production-grade type safety
 */

// События от клиента к серверу
export interface ClientToServerEvents {
  'join-presence': (data: JoinPresencePayload) => void
  'leave-presence': () => void
  'heartbeat': (data: HeartbeatPayload) => void
  'get-user-status': (data: GetUserStatusPayload, callback: (response: UserStatusResponse) => void) => void
  // Board events
  'board:join': (data: { boardId: string; userId: string; userName: string }) => void
  'board:leave': (data: { boardId: string }) => void
  'board:draw': (data: { boardId: string; element: unknown }) => void
  'board:draw-progress': (data: { boardId: string; element: unknown }) => void
  'board:move-batch': (data: { boardId: string; elements: unknown[] }) => void
  'board:move-delta': (data: { boardId: string; elementIds: string[]; dx: number; dy: number }) => void
  'board:resize-delta': (data: { boardId: string; elementIds: string[]; handle: string; dx: number; dy: number; originalBounds: { x: number; y: number; w: number; h: number } }) => void
  'board:erase': (data: { boardId: string; elementIds: string[] }) => void
  'board:cursor': (data: { boardId: string; x: number; y: number; userId: string }) => void
  'board:select': (data: { boardId: string; elementIds: string[] }) => void
  'board:clear': (data: { boardId: string }) => void
  'board:undo': (data: { boardId: string; elementId: string }) => void
  'board:state-response': (data: { boardId: string; requesterId: string; elements: unknown[] }) => void
  // WebRTC signaling
  'board:rtc-offer': (data: { boardId: string; targetUserId: string; offer: RTCSessionDescriptionInit }) => void
  'board:rtc-answer': (data: { boardId: string; targetUserId: string; answer: RTCSessionDescriptionInit }) => void
  'board:rtc-ice-candidate': (data: { boardId: string; targetUserId: string; candidate: RTCIceCandidateInit }) => void
  'board:rtc-hangup': (data: { boardId: string }) => void
  'board:rtc-ready': (data: { boardId: string }) => void
}

// События от сервера к клиенту
export interface ServerToClientEvents {
  'presence-update': (data: PresenceUpdatePayload) => void
  'user-online': (data: UserOnlinePayload) => void
  'user-offline': (data: UserOfflinePayload) => void
  'error': (data: ErrorPayload) => void
  // Board events
  'board:user-joined': (data: { userId: string; userName: string }) => void
  'board:user-left': (data: { userId: string }) => void
  'board:users': (data: { users: Array<{ userId: string; userName: string }> }) => void
  'board:draw': (data: { element: unknown; userId: string }) => void
  'board:draw-progress': (data: { element: unknown; userId: string }) => void
  'board:move-batch': (data: { elements: unknown[]; userId: string }) => void
  'board:move-delta': (data: { elementIds: string[]; dx: number; dy: number; userId: string }) => void
  'board:resize-delta': (data: { elementIds: string[]; handle: string; dx: number; dy: number; originalBounds: { x: number; y: number; w: number; h: number }; userId: string }) => void
  'board:erase': (data: { elementIds: string[]; userId: string }) => void
  'board:cursor': (data: { x: number; y: number; userId: string; userName: string }) => void
  'board:select': (data: { elementIds: string[]; userId: string }) => void
  'board:clear': (data: { userId: string }) => void
  'board:undo': (data: { elementId: string; userId: string }) => void
  'board:request-state': (data: { requesterId: string }) => void
  'board:sync-state': (data: { elements: unknown[] }) => void
  // WebRTC signaling
  'board:rtc-offer': (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => void
  'board:rtc-answer': (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => void
  'board:rtc-ice-candidate': (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => void
  'board:rtc-hangup': (data: { fromUserId: string }) => void
  'board:rtc-ready': (data: { fromUserId: string }) => void
}

// Межсерверные события (для Redis Pub/Sub)
export interface InterServerEvents {
  'sync-presence': (data: SyncPresencePayload) => void
}

// Данные сокета
export interface SocketData {
  userId: string
  joinedAt: number
  lastHeartbeat: number
  boardId?: string
}

// Payloads
export interface JoinPresencePayload {
  userId: string
  metadata?: {
    deviceType?: 'desktop' | 'mobile' | 'tablet'
    userAgent?: string
  }
}

export interface HeartbeatPayload {
  userId: string
  timestamp?: number
}

export interface GetUserStatusPayload {
  userId: string
}

export interface UserStatusResponse {
  userId: string
  isOnline: boolean
  lastSeen: number | null
}

export interface PresenceUpdatePayload {
  onlineUsers: string[]
  lastSeenMap: Record<string, number>
  timestamp: number
}

export interface UserOnlinePayload {
  userId: string
  timestamp: number
}

export interface UserOfflinePayload {
  userId: string
  lastSeen: number
}

export interface ErrorPayload {
  code: string
  message: string
}

export interface SyncPresencePayload {
  serverId: string
  onlineUsers: string[]
  lastSeenMap: Record<string, number>
}

// Структура данных присутствия пользователя
export interface UserPresence {
  userId: string
  socketId: string
  lastSeen: number
  joinedAt: number
  deviceType: 'desktop' | 'mobile' | 'tablet'
}

// Конфигурация сервера
export interface PresenceServerConfig {
  port: number
  redisUrl: string
  corsOrigins: string[]
  pingTimeout: number
  pingInterval: number
  cleanupInterval: number
  userTimeout: number
  maxConnectionsPerIp: number
}

// Метрики для мониторинга
export interface PresenceMetrics {
  connectedSockets: number
  onlineUsers: number
  uptime: number
  messagesPerSecond: number
  redisConnected: boolean
}
