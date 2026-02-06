'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Check, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeacherStudents, shareFile, getFileShares, unshareFile, type FileData } from '@/lib/api'
import { toast } from 'sonner'

interface Relation {
  id: string
  studentName?: string
  student?: {
    id: string
    name?: string
    email?: string
  }
  status: string
}

interface ShareDialogProps {
  file: FileData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ file, open, onOpenChange }: ShareDialogProps) {
  const [selectedRelations, setSelectedRelations] = useState<Set<string>>(new Set())
  const [initialShares, setInitialShares] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  // Get teacher's students
  const { data: relations = [], isLoading: isLoadingRelations } = useQuery({
    queryKey: ['relations', 'teacher'],
    queryFn: getTeacherStudents,
    staleTime: 30000,
  })

  // Get current shares for file
  const { data: shares = [], isLoading: isLoadingShares } = useQuery({
    queryKey: ['file-shares', file?.id],
    queryFn: () => (file ? getFileShares(file.id) : Promise.resolve([])),
    enabled: !!file && open,
    staleTime: 0,
  })

  // Initialize selected relations from current shares
  useEffect(() => {
    if (!open) return
    const sharedIds = new Set(shares.map((s) => s.relationId))
    setSelectedRelations(sharedIds)
    setInitialShares(sharedIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(shares.map((s) => s.relationId).sort())])

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!file) return

      // Find relations to add
      const toAdd = Array.from(selectedRelations).filter((id) => !initialShares.has(id))
      // Find relations to remove
      const toRemove = Array.from(initialShares).filter((id) => !selectedRelations.has(id))

      // Add new shares
      if (toAdd.length > 0) {
        await shareFile(file.id, toAdd)
      }

      // Remove shares
      for (const relationId of toRemove) {
        await unshareFile(file.id, relationId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['file-shares', file?.id] })
      toast.success('Доступ к файлу обновлен')
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ошибка при обновлении доступа')
    },
  })

  const toggleRelation = (relationId: string) => {
    const newSelected = new Set(selectedRelations)
    if (newSelected.has(relationId)) {
      newSelected.delete(relationId)
    } else {
      newSelected.add(relationId)
    }
    setSelectedRelations(newSelected)
  }

  const handleSave = () => {
    shareMutation.mutate()
  }

  const activeRelations = relations.filter((r: Relation) => r.status === 'ACTIVE')
  const isLoading = isLoadingRelations || isLoadingShares
  const hasChanges = 
    Array.from(selectedRelations).some(id => !initialShares.has(id)) ||
    Array.from(initialShares).some(id => !selectedRelations.has(id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поделиться файлом</DialogTitle>
          <DialogDescription className="truncate max-w-[350px]">
            {file?.originalName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : activeRelations.length === 0 ? (
            <div className="text-center py-8">
              <Icon icon={Users} size="lg" className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                У вас пока нет учеников, с которыми можно поделиться файлом
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-3">
                Выберите учеников, которые получат доступ к файлу:
              </p>
              {activeRelations.map((relation: Relation) => {
                const isSelected = selectedRelations.has(relation.id)
                const displayName = relation.studentName || relation.student?.name || relation.student?.email || 'Без имени'
                
                return (
                  <button
                    key={relation.id}
                    onClick={() => toggleRelation(relation.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-muted/30 border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <span className="font-medium text-sm">{displayName}</span>
                    {isSelected && (
                      <Icon icon={Check} size="sm" className="text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={shareMutation.isPending || !hasChanges}
          >
            {shareMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Сохранить'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
