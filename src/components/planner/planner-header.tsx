'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus } from 'lucide-react'

interface PlannerHeaderProps {
  onCreateLesson: () => void
}

export function PlannerHeader({
  onCreateLesson
}: PlannerHeaderProps) {
  return (
    <div className="flex items-center justify-end p-4 bg-white">
      {/* Кнопка добавления */}
      <Button 
        onClick={onCreateLesson}
        className="flex items-center gap-2"
      >
        <Icon icon={Plus} size="sm" />
        <span className="hidden sm:inline">Добавить</span>
      </Button>
    </div>
  )
}
