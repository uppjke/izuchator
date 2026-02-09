'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isTomorrow, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Icon } from '@/components/ui/icon'
import { SearchX } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import type { Lesson } from './types'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

interface SearchResultsProps {
  lessons: Lesson[]
  searchQuery: string
  onLessonClick: (lesson: Lesson) => void
}

function formatDayLabel(date: Date): string {
  if (isToday(date)) return 'Сегодня'
  if (isTomorrow(date)) return 'Завтра'
  if (isYesterday(date)) return 'Вчера'
  return format(date, 'd MMMM, EEEE', { locale: ru })
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'scheduled':
      return { label: 'Запланировано', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    case 'completed':
      return { label: 'Завершено', color: 'bg-green-100 text-green-700 border-green-200' }
    case 'cancelled':
      return { label: 'Отменено', color: 'bg-red-100 text-red-700 border-red-200' }
    case 'confirmed':
      return { label: 'Подтверждено', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    case 'in_progress':
      return { label: 'В процессе', color: 'bg-orange-100 text-orange-700 border-orange-200' }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
  }
}

export function SearchResults({ lessons, searchQuery, onLessonClick }: SearchResultsProps) {
  const { user } = useAuth()

  // Group lessons by date
  const groupedByDate = useMemo(() => {
    const sorted = [...lessons].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    const groups: { date: Date; dateKey: string; label: string; lessons: Lesson[] }[] = []
    const map = new Map<string, typeof groups[number]>()

    for (const lesson of sorted) {
      const d = new Date(lesson.startTime)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      let group = map.get(key)
      if (!group) {
        group = { date: d, dateKey: key, label: formatDayLabel(d), lessons: [] }
        map.set(key, group)
        groups.push(group)
      }
      group.lessons.push(lesson)
    }

    return groups
  }, [lessons])

  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
        <Icon icon={SearchX} size="xl" className="text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-500">
          По запросу «{searchQuery}» ничего не найдено
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-1 py-2 space-y-6">
        {/* Result count */}
        <div className="text-xs text-zinc-400 px-1">
          {lessons.length === 1
            ? 'Найдено 1 занятие'
            : `Найдено ${lessons.length} ${
                lessons.length < 5 ? 'занятия' : 'занятий'
              }`}
        </div>

        {/* Swimlanes by date */}
        <AnimatePresence mode="wait">
          <motion.div
            key={searchQuery}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {groupedByDate.map((group) => (
              <motion.div key={group.dateKey} variants={itemVariants}>
                {/* Date swimlane header */}
                <div className="flex items-center gap-3 mb-2.5 px-1">
                  <span className="text-sm font-semibold text-zinc-700 capitalize whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200" />
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    {group.lessons.length}{' '}
                    {group.lessons.length === 1 ? 'занятие' : group.lessons.length < 5 ? 'занятия' : 'занятий'}
                  </span>
                </div>

                {/* Lesson cards in this date group */}
                <div className="space-y-2">
                  {group.lessons.map((lesson) => {
                    const startDate = new Date(lesson.startTime)
                    const endDate = new Date(lesson.endTime)
                    const accentColor = lesson.labelColor || '#3b82f6'
                    const statusInfo = getStatusInfo(lesson.status || 'scheduled')
                    const timeStart = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                    const timeEnd = endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

                    // Determine partner name
                    const relation = lesson.relation
                    let partnerName = ''
                    if (relation) {
                      const isTeacher = relation.teacherId === user?.id
                      if (isTeacher) {
                        partnerName =
                          relation.studentName || relation.student?.name || relation.student?.email || 'Ученик'
                      } else {
                        partnerName =
                          relation.teacherName || relation.teacher?.name || relation.teacher?.email || 'Преподаватель'
                      }
                    }

                    return (
                      <motion.div
                        key={lesson.id}
                        variants={itemVariants}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div
                          className="group cursor-pointer rounded-2xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 overflow-hidden flex"
                          onClick={() => onLessonClick(lesson)}
                        >
                          {/* Accent bar */}
                          <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ backgroundColor: accentColor }} />

                          <div className="flex-1 min-w-0 px-4 py-3.5 space-y-2">
                            {/* Title + status badge */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="text-[15px] font-semibold truncate flex-1 min-w-0"
                                style={{ color: accentColor }}
                              >
                                {lesson.title}
                              </span>
                              <div
                                className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </div>
                            </div>

                            {/* Time · partner */}
                            <div className="flex items-center gap-2 text-[13px] text-gray-500">
                              <span className="font-medium text-gray-600">
                                {timeStart} – {timeEnd}
                              </span>
                              {partnerName && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <UserAvatar user={{ name: partnerName, avatar_url: null }} size="xs" />
                                  <span className="truncate">{partnerName}</span>
                                </>
                              )}
                            </div>

                            {/* Description snippet if matches */}
                            {lesson.description && searchQuery && lesson.description.toLowerCase().includes(searchQuery.toLowerCase()) && (
                              <p className="text-xs text-zinc-400 truncate">
                                {lesson.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
