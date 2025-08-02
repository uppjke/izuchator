'use client'

import { createContext, useContext } from 'react'

interface PresenceContextType {
  onlineUsers: Set<string>
  isUserOnline: (userId: string) => boolean
  isTracking: boolean
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

export function usePresenceContext() {
  const context = useContext(PresenceContext)
  if (!context) {
    throw new Error('usePresenceContext must be used within a PresenceProvider')
  }
  return context
}

export const PresenceProvider = PresenceContext.Provider
