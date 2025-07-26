'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createSupabaseBrowserClient } from './supabase'
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js'

interface User {
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

// Карта ошибок для централизованной обработки
const ERROR_MESSAGES = {
  user_not_found: 'Пользователь был удален из системы',
  user_already_exists: 'Пользователь с таким email уже зарегистрирован',
  email_address_invalid: 'Неверный формат email адреса',
  signup_disabled: 'Регистрация временно отключена',
  otp_expired: 'Код подтверждения истек. Запросите новый',
  invalid_credentials: 'Неверный код подтверждения',
  too_many_requests: 'Слишком много попыток. Попробуйте позже',
  over_email_send_rate_limit: 'Слишком много писем отправлено.',
  over_request_rate_limit: 'Слишком много запросов.',
} as const

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  // Утилита для обработки ошибок аутентификации
  const handleAuthError = (error: AuthError, isSignUp: boolean = false) => {
    console.log('Auth error:', { code: error.code, message: error.message, status: error.status })
    
    // Обработка стандартных ошибок
    if (error.code && ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES]) {
      throw new Error(ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES])
    }

    // Специальная обработка otp_disabled
    if (error.code === 'otp_disabled') {
      if (!isSignUp && error.message?.includes('Signups not allowed')) {
        throw new Error('Пользователь с таким email не найден')
      }
      throw new Error('Вход по email временно отключен')
    }

    // Обработка сообщений без кода
    if (error.message?.includes('Signups not allowed')) {
      throw new Error(isSignUp ? 'Регистрация через email временно отключена' : 'Пользователь с таким email не найден')
    }

    // Статус 422 обычно означает "пользователь не найден"
    if (error.status === 422) {
      throw new Error('Пользователь с таким email не найден')
    }

    throw error
  }

  // Создание профиля пользователя из данных Supabase
  const createUserProfile = (supabaseUser: SupabaseUser): User => ({
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.display_name || 
          supabaseUser.user_metadata?.name || 
          supabaseUser.email?.split('@')[0] || 'User',
    role: supabaseUser.user_metadata?.role || 'student'
  })

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setUser(createUserProfile(session.user))
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? createUserProfile(session.user) : null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const sendOtp = async (email: string, isSignUp = false, userData?: { name: string; role: string }) => {
    const { error } = isSignUp
      ? await supabase.auth.signUp({
          email,
          password: Math.random().toString(36),
          options: { 
            data: {
              display_name: userData?.name,
              role: userData?.role
            }
          }
        })
      : await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false }
        })

    if (error) handleAuthError(error, isSignUp)
  }

  const verifyOtp = async (email: string, otp: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    
    if (error) handleAuthError(error)
  }

  const resendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })
    
    if (error) handleAuthError(error, false)
  }

  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user,
      sendOtp,
      verifyOtp,
      resendOtp,
      logout,
      isAuthenticated: !!user,
      loading
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
