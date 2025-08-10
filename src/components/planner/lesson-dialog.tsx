'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface LessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date?: Date | null
}

// Прототип диалога создания урока без форм – только заголовок и описание
export function LessonDialog({ open, onOpenChange, date }: LessonDialogProps) {
  const formattedDate = date ? date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">
            Новый урок
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {formattedDate ? (
              <span>Создание урока на <strong>{formattedDate}</strong>. Форма появится позже.</span>
            ) : (
              <span>Создание нового урока. Форма появится позже.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="text-center text-sm text-muted-foreground">
          Это временный прототип без полей.
        </div>
      </DialogContent>
    </Dialog>
  )
}
