'use client'

// Временная заглушка presence после удаления Supabase.
// Возвращает пустой набор онлайн-пользователей и статус tracking=false.
// TODO: реализовать через WebSocket/Redis/Pusher/Ably.

export function usePresence() {
  const empty = new Set<string>()
  const isUserOnline = () => false
  return {
    onlineUsers: empty,
    isUserOnline,
    isTracking: false,
  }
}
