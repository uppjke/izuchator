'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { getLessons, getTeacherStudents, getStudentTeachers, getFiles } from '@/lib/api'
import { 
  format, 
  isToday, 
  isTomorrow, 
  startOfDay, 
  endOfDay, 
  addDays, 
  differenceInMinutes, 
  startOfWeek, 
  endOfWeek
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { 
  Calendar, 
  Users, 
  Clock, 
  FolderOpen, 
  ChevronRight,
  Sparkles,
  BookOpen,
  AlertCircle,
  RefreshCw,
  type LucideIcon
} from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// Анимации (минимальные, чтобы не раздражать)
// ============================================================================

const pulseVariants = {
  pulse: {
    scale: [1, 1.03, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
}

// ============================================================================
// Утилиты
// ============================================================================

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 22) return 'Добрый вечер'
  return 'Доброй ночи'
}

function formatRelativeDate(date: Date): string {
  if (isToday(date)) return 'Сегодня'
  if (isTomorrow(date)) return 'Завтра'
  return format(date, 'd MMMM', { locale: ru })
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 19) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

// ============================================================================
// Skeleton компоненты
// ============================================================================

function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-zinc-200 rounded" />
          <div className="h-7 w-12 bg-zinc-200 rounded" />
          <div className="h-3 w-16 bg-zinc-200 rounded" />
        </div>
        <div className="h-10 w-10 bg-zinc-200 rounded-xl" />
      </div>
    </div>
  )
}

function LessonItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 animate-pulse">
      <div className="text-center min-w-[60px] space-y-1">
        <div className="h-4 w-10 bg-zinc-200 rounded mx-auto" />
        <div className="h-3 w-8 bg-zinc-200 rounded mx-auto" />
      </div>
      <div className="w-0.5 h-10 bg-zinc-200 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-zinc-200 rounded" />
        <div className="h-3 w-24 bg-zinc-200 rounded" />
      </div>
    </div>
  )
}

// ============================================================================
// Компонент ошибки
// ============================================================================

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

function ErrorState({ message = 'Не удалось загрузить данные', onRetry }: ErrorStateProps) {
  return (
    <div 
      className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center"
    >
      <Icon icon={AlertCircle} size="lg" className="mx-auto text-red-400 mb-3" />
      <p className="text-red-600 font-medium">{message}</p>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="mt-3 text-red-600 border-red-200 hover:bg-red-100"
        >
          <Icon icon={RefreshCw} size="sm" className="mr-2" />
          Повторить
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Компонент StatCard
// ============================================================================

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  subtext?: string
  color: 'blue' | 'green' | 'purple' | 'orange'
  onClick?: () => void
  progress?: { current: number; total: number }
}

function StatCard({ icon: IconComponent, label, value, subtext, color, onClick, progress }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100/80',
    green: 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100/80',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100/80',
    orange: 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100/80',
  }

  const iconBgClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
  }

  const progressBgClasses = {
    blue: 'bg-blue-200',
    green: 'bg-green-200',
    purple: 'bg-purple-200',
    orange: 'bg-orange-200',
  }

  const progressFillClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4",
        onClick ? "cursor-pointer" : "cursor-default",
        "transition-all duration-200",
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium opacity-80 truncate">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtext && (
            <p className="text-xs opacity-60 mt-0.5">{subtext}</p>
          )}
          {/* Progress bar */}
          {progress && progress.total > 0 && (
            <div className="mt-2">
              <div className={cn("h-1.5 rounded-full", progressBgClasses[color])}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((progress.current / progress.total) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn("h-full rounded-full", progressFillClasses[color])}
                />
              </div>
            </div>
          )}
        </div>
        <div className={cn("p-2 rounded-xl shrink-0 ml-2", iconBgClasses[color])}>
          <Icon icon={IconComponent} size="md" />
        </div>
      </div>
      {/* Hover chevron */}
      {onClick && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Icon icon={ChevronRight} size="xs" className="opacity-40" />
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Интерфейс и компонент урока
// ============================================================================

interface Lesson {
  id: string
  title: string
  startTime: string
  endTime: string
  relation?: {
    studentName?: string
    teacherName?: string
    student?: { name?: string }
    teacher?: { name?: string }
  }
}

interface LessonItemProps {
  lesson: Lesson
  isNext?: boolean
  onClick?: () => void
}

function LessonItem({ lesson, isNext, onClick }: LessonItemProps) {
  const startTime = new Date(lesson.startTime)
  const endTime = new Date(lesson.endTime)
  const now = new Date()
  const minutesUntil = differenceInMinutes(startTime, now)
  
  const partnerName = lesson.relation?.studentName || 
                      lesson.relation?.student?.name || 
                      lesson.relation?.teacherName || 
                      lesson.relation?.teacher?.name ||
                      'Без ученика'

  const timeUntilText = useMemo(() => {
    if (minutesUntil < 0) return 'Сейчас'
    if (minutesUntil < 60) return `Через ${minutesUntil} мин`
    const hours = Math.floor(minutesUntil / 60)
    return `Через ${hours} ч`
  }, [minutesUntil])

  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.01 : 1 }}
      whileTap={{ scale: onClick ? 0.99 : 1 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-colors",
        onClick && "cursor-pointer",
        isNext 
          ? "bg-zinc-900 text-white" 
          : "bg-zinc-50 hover:bg-zinc-100"
      )}
    >
      {/* Время */}
      <div className={cn(
        "text-center min-w-[60px]",
        isNext ? "text-white" : "text-zinc-600"
      )}>
        <p className="text-sm font-semibold">
          {format(startTime, 'HH:mm')}
        </p>
        <p className={cn(
          "text-xs",
          isNext ? "text-zinc-300" : "text-zinc-400"
        )}>
          {format(endTime, 'HH:mm')}
        </p>
      </div>

      {/* Разделитель */}
      <div className={cn(
        "w-0.5 h-10 rounded-full",
        isNext ? "bg-white/30" : "bg-zinc-200"
      )} />

      {/* Информация */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          isNext ? "text-white" : "text-zinc-900"
        )}>
          {lesson.title}
        </p>
        <p className={cn(
          "text-sm truncate",
          isNext ? "text-zinc-300" : "text-zinc-500"
        )}>
          {partnerName}
        </p>
      </div>

      {/* Время до урока */}
      {isNext && minutesUntil > 0 && (
        <motion.div
          variants={pulseVariants}
          animate="pulse"
          className="bg-white/20 px-2 py-1 rounded-lg shrink-0"
        >
          <p className="text-xs font-medium text-white">{timeUntilText}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Props для DashboardTab
// ============================================================================

type TabId = 'dashboard' | 'planner' | 'students' | 'teachers' | 'materials'

interface DashboardTabProps {
  onNavigate?: (tab: TabId) => void
}

// ============================================================================
// Основной компонент дашборда
// ============================================================================

export function DashboardTab({ onNavigate }: DashboardTabProps) {
  const { user } = useAuth()
  const isTeacher = user?.role?.toUpperCase() === 'TEACHER'
  const userName = user?.name?.split(' ')[0] || 'Пользователь'

  // Даты
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  // Запросы данных с кэшированием
  const { 
    data: lessonsData, 
    isPending: lessonsPending,
    isError: lessonsError,
    refetch: refetchLessons
  } = useQuery({
    queryKey: ['lessons', 'dashboard', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () => getLessons(weekStart, weekEnd),
    staleTime: 30 * 1000, // 30 секунд - данные считаются свежими
  })

  const { 
    data: relationsData,
    isPending: relationsPending,
    isError: relationsError,
    refetch: refetchRelations
  } = useQuery({
    queryKey: isTeacher ? ['teacher-students'] : ['student-teachers'],
    queryFn: isTeacher ? getTeacherStudents : getStudentTeachers,
    staleTime: 60 * 1000, // 1 минута
  })

  const { 
    data: filesData,
    isPending: filesPending,
    isError: filesError,
    refetch: refetchFiles
  } = useQuery({
    queryKey: ['files', 'dashboard'],
    queryFn: () => getFiles(),
    staleTime: 60 * 1000, // 1 минута
  })

  // isPending = true только при первой загрузке (нет данных в кэше)
  // isLoading = isPending && isFetching (включает refetch)
  const isInitialLoading = lessonsPending || relationsPending || filesPending
  const hasError = lessonsError || relationsError || filesError

  const handleRetry = () => {
    refetchLessons()
    refetchRelations()
    refetchFiles()
  }

  // Обработка данных
  const lessons: Lesson[] = lessonsData?.lessons || []
  const relations = relationsData || []
  const files = filesData || []

  // Уроки на сегодня
  const todayLessons = useMemo(() => {
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)
    return lessons
      .filter((l) => {
        const lessonDate = new Date(l.startTime)
        return lessonDate >= dayStart && lessonDate <= dayEnd
      })
      .sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
  }, [lessons, today])

  // Ближайший урок
  const nextLesson = useMemo(() => {
    const now = new Date()
    const tomorrowEnd = endOfDay(addDays(now, 1))
    return lessons
      .filter((l) => new Date(l.startTime) > now && new Date(l.startTime) <= tomorrowEnd)
      .sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )[0]
  }, [lessons])

  // Статистика
  const weekStats = useMemo(() => {
    const now = new Date()
    return {
      totalLessons: lessons.length,
      completedLessons: lessons.filter((l) => new Date(l.endTime) < now).length,
      upcomingLessons: lessons.filter((l) => new Date(l.startTime) >= now).length,
    }
  }, [lessons])

  // Навигация
  const navigateTo = (tab: TabId) => {
    if (onNavigate) {
      onNavigate(tab)
    } else {
      // Fallback: используем localStorage напрямую
      localStorage.setItem('dashboardActiveTab', tab)
      window.location.reload()
    }
  }

  // Состояние ошибки
  if (hasError && !isInitialLoading) {
    return (
      <div className="space-y-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="text-zinc-500 mt-1">
            {format(today, "EEEE, d MMMM", { locale: ru })}
          </p>
        </div>
        <ErrorState 
          message="Не удалось загрузить данные дашборда" 
          onRetry={handleRetry} 
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Приветствие */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {getGreeting()}, {userName}! 
          <motion.span 
            className="inline-block ml-2"
            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
          >
            👋
          </motion.span>
        </h1>
        <p className="text-zinc-500 mt-1">
          {format(today, "EEEE, d MMMM", { locale: ru })}
        </p>
      </div>

      {/* Статистика */}
      <div>
        {isInitialLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Calendar}
              label="Уроков на неделе"
              value={weekStats.totalLessons}
              subtext={`${weekStats.completedLessons} ${pluralize(weekStats.completedLessons, 'проведён', 'проведено', 'проведено')}`}
              color="blue"
              onClick={() => navigateTo('planner')}
              progress={{ current: weekStats.completedLessons, total: weekStats.totalLessons }}
            />
            <StatCard
              icon={Users}
              label={isTeacher ? "Учеников" : "Учителей"}
              value={relations.length}
              color="green"
              onClick={() => navigateTo(isTeacher ? 'students' : 'teachers')}
            />
            <StatCard
              icon={Clock}
              label="Уроков сегодня"
              value={todayLessons.length}
              subtext={todayLessons.length > 0 ? `${weekStats.upcomingLessons} впереди` : undefined}
              color="purple"
              onClick={() => navigateTo('planner')}
            />
            <StatCard
              icon={FolderOpen}
              label="Материалов"
              value={files.length}
              color="orange"
              onClick={() => navigateTo('materials')}
            />
          </div>
        )}
      </div>

      {/* Ближайший урок */}
      {!isInitialLoading && nextLesson && (
        <div 
          className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-5 text-white cursor-pointer hover:from-zinc-800 hover:to-zinc-700 transition-colors"
          onClick={() => navigateTo('planner')}
        >
          <div className="flex items-center gap-2 mb-3">
            <Icon icon={Sparkles} size="sm" className="text-yellow-400" />
            <h3 className="font-semibold">Ближайший урок</h3>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-auto">
              {formatRelativeDate(new Date(nextLesson.startTime))}
            </span>
          </div>
          <LessonItem lesson={nextLesson} isNext />
        </div>
      )}

      {/* Уроки на сегодня */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Icon icon={BookOpen} size="sm" className="text-zinc-500" />
            Сегодня
          </h3>
          {todayLessons.length > 0 && (
            <span className="text-sm text-zinc-500">
              {todayLessons.length} {pluralize(todayLessons.length, 'урок', 'урока', 'уроков')}
            </span>
          )}
        </div>

        {isInitialLoading ? (
          <div className="space-y-2">
            <LessonItemSkeleton />
            <LessonItemSkeleton />
          </div>
        ) : todayLessons.length > 0 ? (
          <div className="space-y-2">
            {todayLessons.slice(0, 4).map((lesson) => (
              <LessonItem 
                key={lesson.id} 
                lesson={lesson} 
                onClick={() => navigateTo('planner')}
              />
            ))}
            {todayLessons.length > 4 && (
              <button 
                onClick={() => navigateTo('planner')}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 flex items-center justify-center gap-1 transition-colors"
              >
                Ещё {todayLessons.length - 4} {pluralize(todayLessons.length - 4, 'урок', 'урока', 'уроков')}
                <Icon icon={ChevronRight} size="xs" />
              </button>
            )}
          </div>
        ) : (
          <div className="bg-zinc-50 rounded-xl p-6 text-center">
            <Icon icon={Calendar} size="lg" className="mx-auto text-zinc-300 mb-2" />
            <p className="text-zinc-500">На сегодня уроков нет</p>
            <p className="text-sm text-zinc-400 mt-1">Отличный день для отдыха! 🌴</p>
          </div>
        )}
      </div>
    </div>
  )
}
