'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  sendOtp: (email: string, isSignUp?: boolean, userData?: { name: string; role: string }) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  resendOtp: (email: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  // Создание профиля пользователя из данных NextAuth
  const createUserProfile = (session: any): User | null => {
    if (!session?.user) return null
    
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || session.user.email?.split('@')[0] || 'User',
      role: session.user.role || 'STUDENT'
    }
  }

  const user = createUserProfile(session)
  const loading = status === 'loading'
  const isAuthenticated = !!session?.user

  // Отправка OTP через NextAuth
  const sendOtp = async (email: string, isSignUp?: boolean, userData?: { name: string; role: string }) => {
    try {
      const result = await signIn('email', { 
        email, 
        redirect: false,
        // Можем передать дополнительные данные через callbackUrl
        callbackUrl: isSignUp ? `/auth/verify?signup=true&role=${userData?.role}&name=${encodeURIComponent(userData?.name || '')}` : '/auth/verify'
      })
      
      if (result?.error) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      throw error
    }
  }

  // Для NextAuth проверка OTP происходит автоматически через magic link
  const verifyOtp = async (email: string, otp: string) => {
    // В NextAuth с email provider проверка происходит через клик по ссылке
    // Этот метод оставляем для совместимости, но он не используется
    console.log('NextAuth handles OTP verification automatically via magic link')
  }

  const resendOtp = async (email: string) => {
    await sendOtp(email)
  }

  const logout = async () => {
    await signOut({ redirect: false })
  }

  const value: AuthContextType = {
    user,
    sendOtp,
    verifyOtp,
    resendOtp,
    logout,
    isAuthenticated,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
