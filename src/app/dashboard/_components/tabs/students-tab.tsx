'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { InviteDialog } from '@/components/invite-dialog'

export function StudentsTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const handleInvite = () => {
    setInviteDialogOpen(true)
  }

  return (
    <div className="relative">
      {/* Кнопка пригласить в правом углу */}
      <div className="absolute top-0 right-0">
        <Button onClick={handleInvite} className="flex items-center gap-2">
          <Plus className="!w-4 !h-4" />
          Пригласить
        </Button>
      </div>

      {/* Центрированное сообщение */}
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <p className="text-lg">У вас пока нет учеников</p>
          <p className="text-sm mt-1">Пригласите ученика или дождитесь приглашения</p>
        </div>
      </div>

      {/* Диалог приглашения */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        type="student"
      />
    </div>
  )
}
