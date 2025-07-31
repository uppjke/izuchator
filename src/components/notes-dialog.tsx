'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Save, X } from 'lucide-react'
import { updateNotesInRelation } from '@/lib/api'
import { toast } from 'sonner'

interface NotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  relationId: string
  currentNotes: string | null
  isTeacherUpdating: boolean
  userName: string
  onNotesUpdated?: () => void
}

const MAX_NOTES_LENGTH = 500

export function NotesDialog({ 
  open, 
  onOpenChange, 
  relationId, 
  currentNotes, 
  isTeacherUpdating, 
  userName,
  onNotesUpdated 
}: NotesDialogProps) {
  const [notes, setNotes] = useState(currentNotes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Обновляем локальное состояние при изменении currentNotes
  useEffect(() => {
    setNotes(currentNotes || '')
  }, [currentNotes])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const result = await updateNotesInRelation(relationId, notes, isTeacherUpdating)
      
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onNotesUpdated?.()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error updating notes:', error)
      toast.error('Ошибка при сохранении заметки')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setNotes(currentNotes || '')
    onOpenChange(false)
  }

  const remainingChars = MAX_NOTES_LENGTH - notes.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Заметка о {userName}
          </DialogTitle>
          <DialogDescription>
            Добавьте личную заметку об этом пользователе. Максимум {MAX_NOTES_LENGTH} символов.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.substring(0, MAX_NOTES_LENGTH))}
              placeholder="Введите заметку..."
              className="w-full min-h-[120px] p-3 border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm"
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center text-xs text-zinc-500">
              <span>
                {notes.length} / {MAX_NOTES_LENGTH} символов
              </span>
              <span className={remainingChars < 50 ? 'text-amber-600' : ''}>
                {remainingChars < 0 ? 'Превышен лимит' : `Осталось: ${remainingChars}`}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <Icon icon={X} size="sm" className="mr-2" />
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || remainingChars < 0}
              className="bg-zinc-900 hover:bg-zinc-700"
            >
              <Icon icon={Save} size="sm" className="mr-2" />
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
