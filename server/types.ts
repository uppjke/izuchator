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
}

// События от сервера к клиенту
export interface ServerToClientEvents {
  'presence-update': (data: PresenceUpdatePayload) => void
  'user-online': (data: UserOnlinePayload) => void
  'user-offline': (data: UserOfflinePayload) => void
  'error': (data: ErrorPayload) => void
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
