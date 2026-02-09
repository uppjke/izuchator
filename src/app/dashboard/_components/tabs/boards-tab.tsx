'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, PenLine, Clock, Layers, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { useAuth } from '@/lib/auth-context'
import { getBoards, createBoard, deleteBoard, type BoardListItem } from '@/lib/api'

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
}

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин назад`
  if (diffHours < 24) return `${diffHours} ч назад`
  if (diffDays < 7) return `${diffDays} дн назад`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function BoardsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isTeacher = user?.role?.toLowerCase() === 'teacher'

  const [deleteTarget, setDeleteTarget] = useState<BoardListItem | null>(null)

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: getBoards,
    staleTime: 30_000,
  })

  // Client-side search filter
  const filteredBoards = boards.filter((board) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      board.title.toLowerCase().includes(q) ||
      board.relation?.student?.name?.toLowerCase().includes(q) ||
      board.relation?.student?.email?.toLowerCase().includes(q) ||
      board.relation?.teacher?.name?.toLowerCase().includes(q) ||
      board.relation?.teacher?.email?.toLowerCase().includes(q)
    )
  })

  const createMutation = useMutation({
    mutationFn: () => createBoard({ title: 'Новая доска' }),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      router.push(`/board/${board.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setDeleteTarget(null)
    },
  })

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {isTeacher && (
        <div className="flex items-center justify-end">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            size="sm"
          >
            <Icon icon={Plus} size="sm" />
            <span className="hidden sm:inline">Создать доску</span>
            <span className="sm:hidden">Создать</span>
          </Button>
        </div>
      )}

      {/* Board list */}
      {boards.length === 0 ? (
        <motion.div
          variants={emptyStateVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Icon icon={PenLine} size="lg" className="text-zinc-400" />
          </div>
          <h3 className="text-base font-medium text-zinc-900 mb-1">
            {isTeacher ? 'Нет досок' : 'Нет доступных досок'}
          </h3>
          <p className="text-sm text-zinc-500 text-center max-w-xs">
            {isTeacher
              ? 'Создайте интерактивную доску для проведения уроков с учениками'
              : 'Ваши преподаватели ещё не создали досок'}
          </p>
          {isTeacher && (
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="mt-4"
              size="sm"
            >
              <Icon icon={Plus} size="sm" />
              Создать первую доску
            </Button>
          )}
        </motion.div>
      ) : filteredBoards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-zinc-500">Ничего не найдено</p>
        </div>
      ) : (
        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredBoards.map((board) => (
              <motion.div
                key={board.id}
                variants={listItemVariants}
                layout
                exit="exit"
                className="group relative bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => router.push(`/board/${board.id}`)}
              >
                {/* Thumbnail / preview */}
                <div className="aspect-[16/10] bg-zinc-50 flex items-center justify-center relative">
                  {board.thumbnail ? (
                    <img
                      src={board.thumbnail}
                      alt={board.title}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <div className="w-full h-full relative">
                      {/* Dot grid pattern for empty boards */}
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, #d4d4d8 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '8px 8px',
                      }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 bg-white/70 rounded-lg px-3 py-2">
                          <Icon icon={PenLine} size="lg" className="text-zinc-300" />
                          <span className="text-[10px] text-zinc-400">Пустая доска</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Delete button */}
                  {isTeacher && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm hover:bg-red-50 hover:text-red-600 h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(board)
                      }}
                    >
                      <Icon icon={Trash2} size="xs" />
                    </Button>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-zinc-900 truncate">
                    {board.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Icon icon={Clock} size="xs" />
                      {formatDate(board.updatedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon={Layers} size="xs" />
                      {board._count.elements}
                    </span>
                  </div>
                  {board.relation?.student && (
                    <p className="text-xs text-zinc-400 mt-1 truncate flex items-center gap-1">
                      <Icon icon={Users} size="xs" />
                      {board.relation.student.name || board.relation.student.email}
                    </p>
                  )}
                  {board.relation?.teacher && (
                    <p className="text-xs text-zinc-400 mt-1 truncate flex items-center gap-1">
                      <Icon icon={Users} size="xs" />
                      {board.relation.teacher.name || board.relation.teacher.email}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Удалить доску?"
        description={`Доска «${deleteTarget?.title}» и все элементы будут удалены навсегда.`}
        confirmText="Удалить"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
