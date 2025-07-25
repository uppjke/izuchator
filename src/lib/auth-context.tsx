'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (email: string) => {
    // Имитация данных пользователя
    setUser({
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      email,
      name: email.split('@')[0],
      role: Math.random() > 0.5 ? 'Student' : 'Teacher',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${email}&backgroundColor=1f2937`
    })
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
