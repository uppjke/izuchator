'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { createInviteLink } from '@/lib/api'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'student' | 'teacher'
}

export function InviteDialog({ open, onOpenChange, type }: InviteDialogProps) {
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const isStudent = type === 'student'
  const title = 'Приглашение'
  const description = isStudent 
    ? 'Отправьте ссылку ученику' 
    : 'Отправьте ссылку преподавателю'

  const generateLink = useCallback(async () => {
    try {
      // Получаем Supabase пользователя
      const supabase = createSupabaseBrowserClient()
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (!supabaseUser) {
        console.error('User not authenticated')
        return
      }
      
      const inviteCode = await createInviteLink({
        createdBy: supabaseUser.id,
        type: type
      })
      
      if (inviteCode) {
        const link = `${window.location.origin}/invite/${inviteCode}?type=${type}`
        setInviteLink(link)
      }
    } catch (error) {
      console.error('Error creating invite:', error)
    }
  }, [type])

  // Автоматически генерируем ссылку при открытии диалога
  useEffect(() => {
    if (open && !inviteLink) {
      generateLink()
    }
  }, [open, inviteLink, generateLink])

  // Сбрасываем состояние при закрытии диалога
  useEffect(() => {
    if (!open) {
      setInviteLink('')
      setCopied(false)
    }
  }, [open])

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      
      // Возвращаем текст кнопки обратно через 2 секунды
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Генерация ссылки */}
          <div className="space-y-2">
            <Label>Ссылка-приглашение</Label>
            <div className="space-y-2">
              <Input 
                value={inviteLink || ''} 
                placeholder={inviteLink ? '' : 'Генерация ссылки...'}
                className="text-xs"
                onFocus={(e) => e.target.select()}
                onChange={() => {}} // Предотвращаем изменения, но разрешаем навигацию курсором
              />
              <Button 
                onClick={handleCopyLink}
                disabled={!inviteLink}
                className="w-full"
              >
                <Icon icon={copied ? Check : Copy} size="sm" className="mr-2" />
                {copied ? 'Скопировано' : 'Скопировать ссылку'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
