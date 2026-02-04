import React from 'react'
import { motion } from 'framer-motion'

interface OnlineIndicatorProps {
  isOnline: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  lastSeenText?: string | null
  className?: string
}

export function OnlineIndicator({ 
  isOnline, 
  size = 'md', 
  showText = false,
  lastSeenText,
  className = '' 
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  // Определяем текст для отображения
  const getStatusText = () => {
    if (isOnline) return 'Онлайн'
    if (lastSeenText) return `Был(а) ${lastSeenText}`
    return 'Офлайн'
  }

  // Текст для tooltip
  const tooltipText = getStatusText()

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Обёртка для hover с увеличенной областью */}
      <div className="relative group/indicator">
        {/* Невидимая область для hover (больше самой точки) */}
        <div className="absolute -inset-2 cursor-default" />
        
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-full ${
            isOnline 
              ? 'bg-green-500' 
              : 'bg-gray-400'
          }`}
          animate={isOnline ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          } : {}}
          transition={{
            duration: 2,
            repeat: isOnline ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
        {isOnline && (
          <motion.div
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-green-500 opacity-20 pointer-events-none`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0, 0.2]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        {/* Tooltip при наведении - справа от точки */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/indicator:opacity-100 group-hover/indicator:visible transition-all duration-200 pointer-events-none z-50">
          {tooltipText}
          {/* Стрелка tooltip - слева */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} ${
          isOnline 
            ? 'text-green-600 font-medium' 
            : 'text-gray-500'
        }`}>
          {getStatusText()}
        </span>
      )}
    </div>
  )
}
