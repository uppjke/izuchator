'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { File, Image, Video, Music, Archive, FileText, Download, FolderOpen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSharedFiles, getFileDownloadUrl, type SharedFileData } from '@/lib/api'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const fileCardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
}

const emptyStateVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }
  }
}

const getFileIcon = (fileType: string, mimeType: string) => {
  switch (fileType) {
    case 'IMAGE': return Image
    case 'VIDEO': return Video
    case 'AUDIO': return Music
    case 'ARCHIVE': return Archive
    default:
      if (mimeType.includes('pdf')) return FileText
      return File
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot + 1).toUpperCase()
}

interface SharedFilesViewProps {
  className?: string
  searchQuery?: string
}

export function SharedFilesView({ className, searchQuery = '' }: SharedFilesViewProps) {
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['shared-files'],
    queryFn: getSharedFiles,
    staleTime: 30000,
  })

  const handleDownload = (file: SharedFileData) => {
    const link = document.createElement('a')
    link.href = getFileDownloadUrl(file.id)
    link.download = file.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Group files by teacher (with search filter applied)
  const filteredFiles = files.filter((file) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      file.originalName.toLowerCase().includes(q) ||
      file.sharedBy?.name?.toLowerCase().includes(q) ||
      file.sharedBy?.email?.toLowerCase().includes(q)
    )
  })

  const filesByTeacher = filteredFiles.reduce((acc, file) => {
    const teacherName = file.sharedBy?.name || file.sharedBy?.email || 'Неизвестный учитель'
    if (!acc[teacherName]) {
      acc[teacherName] = []
    }
    acc[teacherName].push(file)
    return acc
  }, {} as Record<string, SharedFileData[]>)

  const teacherNames = Object.keys(filesByTeacher)

  return (
    <div className={`relative ${className || ''}`}>
      {/* Счетчик файлов */}
      <div className="absolute top-0 left-0">
        <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
          Файлов: {files.length}
        </div>
      </div>

      {/* Список файлов */}
      <div className="pt-16">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              className="flex items-center justify-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </motion.div>
          ) : files.length === 0 ? (
            <motion.div 
              key="empty"
              className="text-center py-16"
              variants={emptyStateVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="mb-6">
                <Icon icon={FolderOpen} size="lg" className="mx-auto text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground/80">Файлов пока нет</h3>
              <p className="text-muted-foreground/70 max-w-sm mx-auto">
                Учителя могут делиться с вами учебными материалами
              </p>
            </motion.div>
          ) : filteredFiles.length === 0 ? (
            <div key="no-results" className="flex items-center justify-center py-16">
              <p className="text-sm text-zinc-500">Ничего не найдено</p>
            </div>
          ) : (
            <div className="space-y-8">
              {teacherNames.map((teacherName) => {
                const teacherFiles = filesByTeacher[teacherName] || []
                return (
                  <div key={teacherName}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">
                      От {teacherName}
                    </h3>
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      variants={gridContainerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {teacherFiles.map((file) => {
                      const FileIcon = getFileIcon(file.fileType, file.mimeType)
                      
                      return (
                        <motion.div 
                          key={file.id} 
                          className="group relative bg-zinc-50/80 rounded-xl border border-zinc-200/50 p-4 hover:bg-zinc-50 transition-colors duration-200"
                          variants={fileCardVariants}
                          layout
                          whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-2 rounded-lg bg-white/60 border border-zinc-200/30">
                              <Icon icon={FileIcon} size="md" className="text-zinc-600" />
                            </div>
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(file)}
                                className="h-7 w-7 p-0 hover:bg-white/80 border border-transparent hover:border-zinc-200/50"
                              >
                                <Icon icon={Download} size="xs" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-medium text-sm leading-tight truncate text-zinc-900" title={file.originalName}>
                              {file.originalName}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>{getFileExtension(file.originalName)}</span>
                              <span>•</span>
                              <span>{format(new Date(file.sharedAt), 'd MMM', { locale: ru })}</span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                    </motion.div>
                  </div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
