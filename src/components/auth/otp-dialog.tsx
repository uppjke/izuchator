'use client'

import { useRef, useState, useEffect } from 'react'
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

export function OtpDialog({ children, open, onOpenChange, email }: Props) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { verifyOtp, resendOtp } = useAuth()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
      setResendTimer(60)
      setCanResend(false)
    }
  }, [open])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (open && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [open, resendTimer])

  const handleSubmit = async (otpString: string) => {
    if (otpString.length === 6 && !isSubmitting) {
      setIsSubmitting(true)
      setError('')
      setSuccess(false)
      
      try {
        await verifyOtp(email || '', otpString)
        setSuccess(true)
        setTimeout(() => {
          onOpenChange?.(false)
          setSuccess(false)
          setOtp(['', '', '', '', '', ''])
        }, 2000)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Неверный код. Попробуйте еще раз.'
        setError(errorMessage)
        setShake(true)
        setOtp(['', '', '', '', '', ''])
        setTimeout(() => {
          setShake(false)
          inputRefs.current[0]?.focus()
        }, 500)
      }
      
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otp.join('').length === 6) {
      handleSubmit(otp.join(''))
      return
    }
    if (e.key === 'Tab' && index === 5) {
      e.preventDefault()
      inputRefs.current[0]?.focus()
      return
    }
    if (e.key === 'Backspace') {
      const newOtp = [...otp]
      if (otp[index]) {
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
      return
    }
    
    // обрабатываем ввод цифр напрямую
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const newOtp = [...otp]
      newOtp[index] = e.key
      
      if (error) setError('')
      setOtp(newOtp)
      
      if (index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i]
    }
    
    setOtp(newOtp)
    const nextEmptyIndex = newOtp.findIndex(digit => !digit)
    const focusIndex = nextEmptyIndex === -1 ? 5 : Math.min(nextEmptyIndex, pastedData.length)
    inputRefs.current[focusIndex]?.focus()
  }

  const handleResend = async () => {
    if (!canResend || !email) return
    
    try {
      setCanResend(false)
      setResendTimer(60)
      setError('')
      
      await resendOtp(email)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при повторной отправке'
      setError(errorMessage)
    }
  }

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
                onFocus={(e) => {
                  setTimeout(() => e.target.setSelectionRange(1, 1), 0)
                }}
                className={`w-12 h-12 text-center text-lg font-mono rounded-md caret-transparent ${
                  error ? 'border-red-500 focus:border-red-500' : 
                  success ? 'border-green-500 focus:border-green-500' : ''
                }`}
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
            onClick={() => handleSubmit(otp.join(''))}
            className="w-full bg-zinc-900 hover:bg-zinc-700" 
            disabled={isSubmitting || otp.join('').length !== 6}
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
            {canResend ? 'Отправить код повторно' : `Отправить код повторно через ${resendTimer}с`}
            <Clock className="!w-4 !h-4 mr-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
