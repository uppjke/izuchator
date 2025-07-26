'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { OtpDialog } from './otp-dialog'

const emailSchema = z.object({
  email: z.string().email('Неверный формат email')
})

type FormData = z.infer<typeof emailSchema>

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSwitchToRegister?: () => void
}

export function LoginDialog({ children, open, onOpenChange, onSwitchToRegister }: Props) {
  const [otpOpen, setOtpOpen] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [serverError, setServerError] = useState('')
  const { sendOtp } = useAuth()
  
  const form = useForm<FormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' }
  })

  const { formState: { isSubmitting } } = form

  const onSubmit = async (data: FormData) => {
    try {
      setServerError('')
      await sendOtp(data.email, false)
      setPendingEmail(data.email)
      onOpenChange?.(false)
      setOtpOpen(true)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки кода'
      setServerError(errorMessage)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-semibold">Вход</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Введите e-mail для получения кода.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        disabled={isSubmitting}
                        className={serverError ? 'border-red-500 focus:border-red-500' : ''}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {serverError && (
                <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded-full">
                  {serverError}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-zinc-900 hover:bg-zinc-700" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Отправляем...' : 'Отправить'}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Нет аккаунта?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-500 underline-offset-4 hover:underline"
                  onClick={onSwitchToRegister}
                >
                  Зарегистрироваться
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <OtpDialog 
        open={otpOpen} 
        onOpenChange={setOtpOpen}
        email={pendingEmail}
      />
    </>
  )
}