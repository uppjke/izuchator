'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'
import { OtpDialog } from './otp-dialog'

const schema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Неверный формат email'),
  role: z.string().min(1, 'Выберите роль')
})

type FormData = z.infer<typeof schema>

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSwitchToLogin?: () => void
}

export function RegisterDialog({ children, open, onOpenChange, onSwitchToLogin }: Props) {
  const [otpOpen, setOtpOpen] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [serverError, setServerError] = useState('')
  const { sendOtp } = useAuth()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', role: 'student' }
  })

  const onSubmit = async (data: FormData) => {
    try {
      setServerError('') // Очищаем предыдущие серверные ошибки
      await sendOtp(data.email, true, { name: data.name, role: data.role })
      setPendingEmail(data.email)
      onOpenChange?.(false)
      setOtpOpen(true)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка регистрации'
      setServerError(errorMessage)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-semibold">Создание аккаунта</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Заполните все поля для создания аккаунта.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ваше имя"
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        disabled={form.formState.isSubmitting}
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

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Роль</FormLabel>
                    <Select 
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="student">Ученик</SelectItem>
                        <SelectItem value="teacher">Преподаватель</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Создаем аккаунт...' : 'Создать аккаунт'}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Уже есть аккаунт?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-500 underline-offset-4 hover:underline"
                  onClick={() => {
                    onSwitchToLogin?.()
                  }}
                >
                  Войти
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