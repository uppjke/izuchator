'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Upload, File, Image, Video, Music, Archive, FileText, Download, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFiles, uploadFile, deleteFile, getFileDownloadUrl, type FileData } from '@/lib/api'
import { toast } from 'sonner'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

interface FileManagerProps {
  relationId?: string
  className?: string
}

export function FileManager({ relationId, className }: FileManagerProps) {
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const queryClient = useQueryClient()

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', relationId],
    queryFn: () => getFiles({ relationId }),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, relationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Файл успешно загружен')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ошибка загрузки файла')
    },
    onSettled: () => {
      setIsUploading(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Файл удален')
    },
    onError: () => {
      toast.error('Ошибка удаления файла')
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Файл "${file.name}" слишком большой. Максимальный размер: 10 МБ`)
        return
      }
      setIsUploading(true)
      uploadMutation.mutate(file)
    })
  }, [uploadMutation])

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Тип файла "${file.type}" не поддерживается`)
      return false
    }
    
    return true
  }

  const handleDownload = (file: FileData) => {
    const link = document.createElement('a')
    link.href = getFileDownloadUrl(file.id)
    link.download = file.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = (file: FileData) => {
    setFileToDelete(file)
  }

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.id)
      setFileToDelete(null)
    }
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        if (!validateFile(file)) return false
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Файл "${file.name}" слишком большой. Максимальный размер: 10 МБ`)
          return false
        }
        return true
      })
      onDrop(validFiles)
    }
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Счетчик файлов в левом верхнем углу */}
      <div className="absolute top-0 left-0">
        <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
          Файлов: {files.length}
        </div>
      </div>

      {/* Кнопка добавить в правом углу */}
      <div className="absolute top-0 right-0">
        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon icon={Upload} size="sm" />
          )}
          <span className="hidden sm:inline">Добавить</span>
        </Button>
      </div>

      {/* Скрытый input для выбора файлов */}
      <input
        type="file"
        multiple
        accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        className="hidden"
        id="file-upload"
        onChange={handleFileInput}
      />

      {/* Список файлов с отступом сверху */}
      <div className="pt-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <Icon icon={File} size="lg" className="mx-auto text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-foreground/80">Файлов пока нет</h3>
            <p className="text-muted-foreground/70 mb-6 max-w-sm mx-auto">
              Загрузите первый файл, чтобы начать работу с материалами
            </p>
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              className="h-9 px-6 bg-foreground text-background hover:bg-foreground/90"
              size="sm"
            >
              <Icon icon={Upload} size="xs" />
              <span className="ml-2">Загрузить файл</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.fileType, file.mimeType)
              
              return (
                <div key={file.id} className="group relative bg-zinc-50/80 rounded-xl border border-zinc-200/50 p-4 hover:bg-zinc-50 transition-all duration-200">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50/80 border border-transparent hover:border-red-200/50"
                      >
                        <Icon icon={Trash2} size="xs" />
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
                      <span>{format(new Date(file.createdAt), 'd MMM', { locale: ru })}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Диалог подтверждения удаления */}
      <ConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title="Удалить файл"
        description={`Вы уверены, что хотите удалить файл "${fileToDelete?.originalName}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}
