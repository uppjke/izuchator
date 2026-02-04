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
import { ConsentCheckbox, AgeConsentCheckbox } from '@/components/consent-checkboxes'
import { useAuth } from '@/lib/auth-context'
import { OtpDialog } from './otp-dialog'

const registerSchema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Неверный формат email'),
  role: z.string().min(1, 'Выберите роль'),
  consent: z.boolean().refine(val => val === true, {
    message: 'Необходимо согласие на обработку данных'
  }),
  ageConsent: z.boolean().refine(val => val === true, {
    message: 'Необходимо подтверждение возраста'
  })
})

type FormData = z.infer<typeof registerSchema>

const ROLE_OPTIONS = [
  { value: 'student', label: 'Ученик' },
  { value: 'teacher', label: 'Преподаватель' }
] as const

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
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', role: 'student', consent: false, ageConsent: false }
  })

  const { formState: { isSubmitting } } = form

  const onSubmit = async (data: FormData) => {
    try {
      setServerError('')
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-semibold">Создание аккаунта</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Заполните все поля для создания аккаунта
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
                        disabled={isSubmitting}
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
                <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
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
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLE_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Legal Consent Checkboxes - ФЗ-152 Compliance */}
              <div className="space-y-3 pt-2">
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ConsentCheckbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ageConsent"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <AgeConsentCheckbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Создаем аккаунт...' : 'Создать аккаунт'}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Уже есть аккаунт?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-500 underline-offset-4 hover:underline"
                  onClick={onSwitchToLogin}
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