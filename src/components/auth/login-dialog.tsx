'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LoginDialog({ children, open, onOpenChange }: Props) {
  const [state, setState] = useState({ email: '', loading: false })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, loading: true }))
    
    // TODO: Здесь будет логика отправки OTP
    console.log('Отправка OTP на:', state.email)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    setState(prev => ({ ...prev, loading: false }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">Вход</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Введите email для получения кода входа
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={state.email}
              onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
              required
              disabled={state.loading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-zinc-900 hover:bg-zinc-700" 
            disabled={state.loading || !state.email}
          >
            {state.loading ? 'Отправляем...' : 'Отправить'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}