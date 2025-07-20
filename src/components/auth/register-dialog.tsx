'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function RegisterDialog({ children, open, onOpenChange }: Props) {
  const [state, setState] = useState({ name: '', email: '', role: '', loading: false })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, loading: true }))
    
    // TODO: Здесь будет логика регистрации и отправки OTP
    console.log('Регистрация:', { name: state.name, email: state.email, role: state.role })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    setState(prev => ({ ...prev, loading: false }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">Создание аккаунта</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              placeholder="Ваше имя"
              value={state.name}
              onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
              disabled={state.loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={state.email}
              onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
              disabled={state.loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Select 
              value={state.role} 
              onValueChange={(role) => setState(prev => ({ ...prev, role }))} 
              disabled={state.loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Ученик</SelectItem>
                <SelectItem value="teacher">Преподаватель</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={state.loading || !state.name || !state.email || !state.role}
          >
            {state.loading ? 'Создаем аккаунт...' : 'Создать аккаунт'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}