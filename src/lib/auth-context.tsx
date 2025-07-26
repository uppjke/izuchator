'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createSupabaseBrowserClient } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) loadUserProfile(session.user)
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadUserProfile(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const loadUserProfile = (supabaseUser: SupabaseUser) => {
    setUser({
      id: supabaseUser.id.slice(0, 6),
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.display_name || 
            supabaseUser.user_metadata?.name || 
            supabaseUser.email?.split('@')[0] || 'User',
      role: supabaseUser.user_metadata?.role || 'student',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${supabaseUser.email}&backgroundColor=1f2937`
    })
  }

  const sendOtp = async (email: string, isSignUp = false, userData?: { name: string; role: string }) => {
    const { error } = isSignUp
      ? await supabase.auth.signUp({
          email,
          password: Math.random().toString(36),
          options: { data: userData }
        })
      : await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false }
        })

    if (error) {
      switch (error.code) {
        case 'user_not_found':
          throw new Error('Пользователь с таким email не найден')
        case 'user_already_exists':
          throw new Error('Пользователь с таким email уже зарегистрирован')
        case 'email_address_invalid':
          throw new Error('Неверный формат email адреса')
        case 'signup_disabled':
          throw new Error('Регистрация временно отключена')
        case 'otp_disabled':
          throw new Error('Вход по email временно отключен')
        case 'over_email_send_rate_limit':
          throw new Error('Слишком много писем отправлено. Попробуйте позже')
        case 'over_request_rate_limit':
          throw new Error('Слишком много запросов. Попробуйте через несколько минут')
        default:
          // Обрабатываем сообщения, которые могут приходить без кода
          if (error.message?.includes('Signups not allowed')) {
            throw new Error('Регистрация через email временно отключена')
          }
          throw error
      }
    }
  }

  const verifyOtp = async (email: string, otp: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    
    if (error) {
      switch (error.code) {
        case 'otp_expired':
          throw new Error('Код подтверждения истек. Запросите новый')
        case 'invalid_credentials':
          throw new Error('Неверный код подтверждения')
        case 'too_many_requests':
          throw new Error('Слишком много попыток. Попробуйте позже')
        default:
          throw error
      }
    }
  }

  const resendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })
    
    if (error) {
      switch (error.code) {
        case 'user_not_found':
          throw new Error('Пользователь с таким email не найден')
        case 'over_email_send_rate_limit':
          throw new Error('Слишком много писем отправлено. Попробуйте позже')
        case 'over_request_rate_limit':
          throw new Error('Слишком много запросов. Попробуйте через несколько минут')
        default:
          throw error
      }
    }
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
