'use client'

import { useState } from 'react'
import { FileManager } from '@/components/file-manager'
import { SharedFilesView } from '@/components/shared-files-view'
import { useQuery } from '@tanstack/react-query'
import { getTeacherStudents } from '@/lib/api'

type ViewMode = 'my-files' | 'shared-with-me'

export function MaterialsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('my-files')
  
  // Determine if user is a teacher (has students)
  const { data: relations = [] } = useQuery({
    queryKey: ['relations', 'teacher'],
    queryFn: getTeacherStudents,
    staleTime: 60000,
  })
  
  const isTeacher = relations.length > 0

  return (
    <div className="w-full max-w-full overflow-x-auto">
      {/* Переключатель режимов */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('my-files')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'my-files'
              ? 'bg-foreground text-background'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Мои файлы
        </button>
        <button
          onClick={() => setViewMode('shared-with-me')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'shared-with-me'
              ? 'bg-foreground text-background'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Файлы от учителей
        </button>
      </div>

      {/* Контент */}
      {viewMode === 'my-files' ? (
        <FileManager isTeacher={isTeacher} />
      ) : (
        <SharedFilesView />
      )}
    </div>
  )
}
