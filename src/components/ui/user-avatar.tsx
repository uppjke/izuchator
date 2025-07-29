import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user?: {
    name?: string
    email?: string
    avatar_url?: string | null
  } | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm lg:w-12 lg:h-12 lg:text-base',
  lg: 'w-16 h-16 text-lg'
}

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const getInitials = () => {
    if (!user) return 'У'
    
    const name = user.name
    if (name && name !== user.email?.split('@')[0]) {
      return name.charAt(0).toUpperCase()
    }
    return user.email?.charAt(0).toUpperCase() || 'У'
  }

  // Если есть аватар, показываем его
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name || 'Пользователь'}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  // Если аватара нет, показываем инициалы на цветном фоне
  return (
    <div className={cn(
      'rounded-full bg-zinc-900 flex items-center justify-center text-white font-medium flex-shrink-0',
      sizeClasses[size],
      className
    )}>
      {getInitials()}
    </div>
  )
}
