'use client'

import { createContext, useContext } from 'react'

interface PresenceContextType {
  onlineUsers: Set<string>
  lastSeenMap: Map<string, number>
  isUserOnline: (userId: string) => boolean
  getLastSeen: (userId: string) => number | null
  formatLastSeen: (userId: string) => string | null
  isTracking: boolean
  isConnected: boolean
}

const defaultValue: PresenceContextType = {
  onlineUsers: new Set(),
  lastSeenMap: new Map(),
  isUserOnline: () => false,
  getLastSeen: () => null,
  formatLastSeen: () => null,
  isTracking: false,
  isConnected: false
}

const PresenceContext = createContext<PresenceContextType>(defaultValue)

export function usePresenceContext() {
  return useContext(PresenceContext)
}

export const PresenceProvider = PresenceContext.Provider
