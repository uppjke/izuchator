'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  otp: z.string().min(6, 'Код должен содержать 6 цифр').max(6, 'Код должен содержать 6 цифр').regex(/^\d+$/, 'Код должен содержать только цифры')
})

type FormData = z.infer<typeof schema>

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  email?: string
}

export function OtpDialog({ children, open, onOpenChange, email }: Props) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' }
  })

  const handleOtpChange = (index: number, value: string) => {
    // Разрешаем только цифры
    const digit = value.replace(/\D/g, '').slice(0, 1)
    
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    
    // Обновляем значение формы
    const otpString = newOtp.join('')
    form.setValue('otp', otpString)
    
    // Автоматически переходим к следующему полю
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Автоматически отправляем форму когда все 6 цифр введены
    if (otpString.length === 6) {
      onSubmit({ otp: otpString })
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace - переходим к предыдущему полю если текущее пустое
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // ArrowLeft/ArrowRight для навигации
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
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
    form.setValue('otp', newOtp.join(''))
    
    // Фокусируемся на следующем пустом поле или последнем заполненном
    const nextEmptyIndex = newOtp.findIndex(digit => !digit)
    const focusIndex = nextEmptyIndex === -1 ? 5 : Math.min(nextEmptyIndex, pastedData.length)
    inputRefs.current[focusIndex]?.focus()
  }

  const onSubmit = async (data: FormData) => {
    // TODO: Здесь будет логика проверки OTP
    console.log('Проверка OTP:', data.otp, 'для email:', email)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
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
        
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="otp"
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, index) => (
                        <Input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          className="w-12 h-12 text-center text-lg font-mono rounded-md"
                          disabled={form.formState.isSubmitting}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
