'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  onResendOtp?: () => void
  onBack?: () => void
}

export function OtpDialog({ children, open, onOpenChange, email, onResendOtp, onBack }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' }
  })

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
            Введите код из письма, отправленного на {email ? <strong>{email}</strong> : 'ваш email'}.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Код подтверждения</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="text-center text-lg font-mono tracking-widest"
                      disabled={form.formState.isSubmitting}
                      {...field}
                      onChange={(e) => {
                        // Разрешаем только цифры
                        const value = e.target.value.replace(/\D/g, '')
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-zinc-900 hover:bg-zinc-700" 
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Проверяем...' : 'Подтвердить'}
            </Button>
            
            <div className="space-y-2">
              <div className="text-center text-sm text-muted-foreground">
                Не получили код?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-500 underline-offset-4 hover:underline"
                  onClick={() => {
                    onResendOtp?.()
                  }}
                  disabled={form.formState.isSubmitting}
                >
                  Отправить повторно
                </button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-500 underline-offset-4 hover:underline"
                  onClick={() => {
                    onBack?.()
                  }}
                  disabled={form.formState.isSubmitting}
                >
                  ← Изменить email
                </button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
