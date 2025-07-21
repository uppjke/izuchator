'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email('Неверный формат email')
})

type FormData = z.infer<typeof schema>

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LoginDialog({ children, open, onOpenChange }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  })

  const onSubmit = async (data: FormData) => {
    // TODO: Здесь будет логика отправки OTP
    console.log('Отправка OTP на:', data.email)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return (
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
                      disabled={form.formState.isSubmitting}
                      {...field}
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
              {form.formState.isSubmitting ? 'Отправляем...' : 'Отправить'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}