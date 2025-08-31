'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, File, Image, Video, Music, Archive, FileText, Download, Trash2, Grid, List, Filter } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')
  
  const queryClient = useQueryClient()

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', relationId, fileTypeFilter],
    queryFn: () => getFiles({ 
      relationId, 
      type: fileTypeFilter === 'all' ? undefined : fileTypeFilter 
    }),
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
    <div className={className}>
      {/* Скрытый input для выбора файлов */}
      <input
        type="file"
        multiple
        accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        className="hidden"
        id="file-upload"
        onChange={handleFileInput}
      />
      
      {/* Панель управления */}
      <div className="flex items-center justify-between mb-6">
        {/* Левая сторона - фильтры и вид */}
        <div className="flex items-center gap-3">
          {/* Фильтр по типам файлов */}
          <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Icon icon={Filter} size="xs" />
                  Все файлы
                </div>
              </SelectItem>
              <SelectItem value="IMAGE">
                <div className="flex items-center gap-2">
                  <Icon icon={Image} size="xs" />
                  Изображения
                </div>
              </SelectItem>
              <SelectItem value="DOCUMENT">
                <div className="flex items-center gap-2">
                  <Icon icon={FileText} size="xs" />
                  Документы
                </div>
              </SelectItem>
              <SelectItem value="VIDEO">
                <div className="flex items-center gap-2">
                  <Icon icon={Video} size="xs" />
                  Видео
                </div>
              </SelectItem>
              <SelectItem value="AUDIO">
                <div className="flex items-center gap-2">
                  <Icon icon={Music} size="xs" />
                  Аудио
                </div>
              </SelectItem>
              <SelectItem value="ARCHIVE">
                <div className="flex items-center gap-2">
                  <Icon icon={Archive} size="xs" />
                  Архивы
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Количество файлов */}
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {files.length} {files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}
            </span>
          )}
          
          {/* Разделитель */}
          <div className="w-px h-6 bg-border" />
          
          {/* Переключатель вида */}
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Icon icon={Grid} size="xs" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <Icon icon={List} size="xs" />
          </Button>
        </div>

        {/* Правая сторона - кнопка добавления */}
        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Загружаем...
            </>
          ) : (
            <>
              <Icon icon={Upload} size="xs" />
              Добавить
            </>
          )}
        </Button>
      </div>

      {/* Список файлов */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Icon icon={File} size="lg" className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Файлов пока нет</p>
            <p className="text-muted-foreground">
              Загрузите первый файл, перетащив его в область выше
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {files.map((file) => {
            const FileIcon = getFileIcon(file.fileType, file.mimeType)
            
            if (viewMode === 'grid') {
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Icon icon={FileIcon} size="md" className="text-blue-500" />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="h-8 w-8 p-0"
                        >
                          <Icon icon={Download} size="xs" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Icon icon={Trash2} size="xs" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-medium text-sm mb-1 truncate" title={file.originalName}>
                      {file.originalName}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatFileSize(file.size)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(file.createdAt), 'd MMM yyyy', { locale: ru })}
                    </p>
                  </CardContent>
                </Card>
              )
            } else {
              return (
                <Card key={file.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Icon icon={FileIcon} size="sm" className="text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate" title={file.originalName}>
                          {file.originalName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {format(new Date(file.createdAt), 'd MMM yyyy', { locale: ru })}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="h-8 w-8 p-0"
                        >
                          <Icon icon={Download} size="xs" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Icon icon={Trash2} size="xs" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }
          })}
        </div>
      )}

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
