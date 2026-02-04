'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import type { Session } from 'next-auth'

interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'teacher'
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
  const createUserProfile = (session: Session | null): User | null => {
    if (!session?.user) return null
    
    const rawRole = ((session.user as { role?: string }).role || 'STUDENT').toString()
    const normalizedRole = rawRole.toLowerCase() === 'teacher' ? 'teacher' : 'student'
    return {
      id: session.user.id!,
      email: session.user.email || '',
      name: session.user.name || session.user.email?.split('@')[0] || 'User',
      role: normalizedRole
    }
  }

  const user = createUserProfile(session)
  const loading = status === 'loading'
  const isAuthenticated = !!session?.user

  // Отправка OTP через NextAuth
  const sendOtp = async (email: string, isSignUp?: boolean, userData?: { name: string; role: string }) => {
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: userData?.name, role: userData?.role, isSignUp })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось отправить код')
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      throw error
    }
  }

  // Для NextAuth проверка OTP происходит автоматически через magic link
  const verifyOtp = async (email: string, otp: string) => {
    const result = await signIn('otp', { redirect: false, email, code: otp })
    if (result?.error) {
      // Преобразуем технические ошибки NextAuth в понятные сообщения
      const errorMessages: Record<string, string> = {
        'CredentialsSignin': 'Неверный или просроченный код',
        'Configuration': 'Ошибка конфигурации сервера',
        'AccessDenied': 'Доступ запрещён',
      }
      const message = errorMessages[result.error] || 'Неверный код. Попробуйте ещё раз'
      throw new Error(message)
    }
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
