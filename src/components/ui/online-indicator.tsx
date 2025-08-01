import React from 'react'
import { motion } from 'framer-motion'

interface OnlineIndicatorProps {
  isOnline: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function OnlineIndicator({ 
  isOnline, 
  size = 'md', 
  showText = false,
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

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative">
        <motion.div
          className={`${sizeClasses[size]} rounded-full ${
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
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-green-500 opacity-20`}
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
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} ${
          isOnline 
            ? 'text-green-600 font-medium' 
            : 'text-gray-500'
        }`}>
          {isOnline ? 'Онлайн' : 'Офлайн'}
        </span>
      )}
    </div>
  )
}
