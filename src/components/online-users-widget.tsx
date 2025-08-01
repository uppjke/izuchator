'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { OnlineIndicator } from '@/components/ui/online-indicator'
import { usePresence } from '@/hooks/use-presence'

export function OnlineUsersWidget() {
  const { onlineUsers, isTracking } = usePresence()

  if (!isTracking) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <OnlineIndicator isOnline={true} size="sm" />
        <h3 className="text-sm font-medium text-gray-900">
          Онлайн сейчас ({onlineUsers.size})
        </h3>
      </div>
      
      {onlineUsers.size === 0 ? (
        <p className="text-xs text-gray-500">Никого нет онлайн</p>
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {Array.from(onlineUsers).map((userId) => (
              <motion.div
                key={userId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 text-xs text-gray-600"
              >
                <OnlineIndicator isOnline={true} size="sm" />
                <span className="truncate">{userId}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
