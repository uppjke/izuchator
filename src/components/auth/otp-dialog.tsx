'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  email?: string
}

const OTP_LENGTH = 6
const RESEND_TIMER_DURATION = 60
const SUCCESS_DELAY = 2000
const SHAKE_DELAY = 500

export function OtpDialog({ children, open, onOpenChange, email }: Props) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const [resendTimer, setResendTimer] = useState(RESEND_TIMER_DURATION)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { verifyOtp, resendOtp } = useAuth()

  // Утилита для очистки состояния
  const resetState = useCallback(() => {
    setOtp(Array(OTP_LENGTH).fill(''))
    setError('')
    setSuccess(false)
    setShake(false)
  }, [])

  // Инициализация при открытии диалога
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
      setResendTimer(RESEND_TIMER_DURATION)
      setCanResend(false)
      resetState()
    }
  }, [open, resetState])

  // Таймер для повторной отправки
  useEffect(() => {
    if (!open || resendTimer <= 0) return

    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open, resendTimer])

  // Утилита для обработки ошибок
  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage
    setError(errorMessage)
  }, [])

  // Обработка успешной верификации
  const handleSuccess = useCallback(() => {
    setSuccess(true)
    setTimeout(() => {
      onOpenChange?.(false)
      resetState()
    }, SUCCESS_DELAY)
  }, [onOpenChange, resetState])

  // Обработка ошибки верификации
  const handleVerificationError = useCallback((error: unknown) => {
    handleError(error, 'Неверный код. Попробуйте еще раз.')
    setShake(true)
    setOtp(Array(OTP_LENGTH).fill(''))
    setTimeout(() => {
      setShake(false)
      inputRefs.current[0]?.focus()
    }, SHAKE_DELAY)
  }, [handleError])

  const handleSubmit = async (otpString: string) => {
    if (otpString.length !== OTP_LENGTH || isSubmitting || !email) return

    setIsSubmitting(true)
    setError('')
    setSuccess(false)
    
    try {
      await verifyOtp(email, otpString)
      handleSuccess()
    } catch (error) {
      handleVerificationError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    const key = e.key
    
    // Enter для отправки
    if (key === 'Enter' && otp.join('').length === OTP_LENGTH) {
      handleSubmit(otp.join(''))
      return
    }
    
    // Tab на последнем элементе - переход к первому
    if (key === 'Tab' && index === OTP_LENGTH - 1) {
      e.preventDefault()
      inputRefs.current[0]?.focus()
      return
    }
    
    // Backspace
    if (key === 'Backspace') {
      const newOtp = [...otp]
      if (otp[index]) {
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
      return
    }
    
    // Ввод цифр
    if (key >= '0' && key <= '9') {
      e.preventDefault()
      const newOtp = [...otp]
      newOtp[index] = key
      
      if (error) setError('')
      setOtp(newOtp)
      
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    const newOtp = [...otp]
    
    for (let i = 0; i < pastedData.length && i < OTP_LENGTH; i++) {
      newOtp[i] = pastedData[i]
    }
    
    setOtp(newOtp)
    const nextEmptyIndex = newOtp.findIndex(digit => !digit)
    const focusIndex = nextEmptyIndex === -1 ? OTP_LENGTH - 1 : Math.min(nextEmptyIndex, pastedData.length)
    inputRefs.current[focusIndex]?.focus()
  }

  const handleResend = async () => {
    if (!canResend || !email) return
    
    try {
      setCanResend(false)
      setResendTimer(RESEND_TIMER_DURATION)
      setError('')
      
      await resendOtp(email)
    } catch (error) {
      handleError(error, 'Ошибка при повторной отправке')
    }
  }

  // Мемоизированные значения для оптимизации рендера
  const otpString = otp.join('')
  const isOtpComplete = otpString.length === OTP_LENGTH
  const inputClassName = `w-12 h-12 text-center text-lg font-mono rounded-md caret-transparent ${
    error ? 'border-red-500 focus:border-red-500' : 
    success ? 'border-green-500 focus:border-green-500' : ''
  }`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">Подтверждение</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Введите код из письма, отправленного на {email ? <strong>{email}</strong> : 'ваш email'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className={`flex gap-2 justify-center ${shake ? 'animate-shake' : ''}`}>
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={() => {}} 
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => setTimeout(() => e.target.setSelectionRange(1, 1), 0)}
                className={inputClassName}
                disabled={isSubmitting}
                autoFocus={index === 0}
              />
            ))}
          </div>
          
          {error && (
            <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded-full">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-center text-sm text-green-600 bg-green-50 p-2 rounded-full">
              ✓ Код подтвержден успешно!
            </div>
          )}
          
          <Button 
            onClick={() => handleSubmit(otpString)}
            className="w-full bg-zinc-900 hover:bg-zinc-700" 
            disabled={isSubmitting || !isOtpComplete}
          >
            {isSubmitting ? 'Проверяем...' : 'Проверить'}
          </Button>
          
          <Button 
            onClick={handleResend}
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            disabled={!canResend}
          >
            <Clock className="!w-4 !h-4 mr-1" />
            {canResend ? 'Отправить код повторно' : `Отправить код повторно через ${resendTimer}с`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
