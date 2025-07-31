'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Trash2 } from 'lucide-react'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  onConfirm: () => void
  isLoading?: boolean
  variant?: 'destructive' | 'default'
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Подтвердить',
  onConfirm,
  isLoading = false,
  variant = 'default'
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  // Простая функция для парсинга **текст** в <strong>
  const parseDescription = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2)
        return <strong key={index}>{content}</strong>
      }
      return part
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground whitespace-pre-line">
            {parseDescription(description)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              className="w-full"
            >
              {variant === 'destructive' && <Icon icon={Trash2} size="sm" className="mr-2 text-white" />}
              <span className={variant === 'destructive' ? 'text-white' : ''}>
                {isLoading ? 'Загрузка...' : confirmText}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
