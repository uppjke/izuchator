'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'izuchator_cookie_consent'

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Проверяем, было ли уже дано согласие
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Небольшая задержка для лучшего UX
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setIsVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined')
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4 md:p-6"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-zinc-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-900">
                    Мы используем cookies
                  </h3>
                  <button
                    onClick={handleDecline}
                    className="flex-shrink-0 p-1 -m-1 rounded-full hover:bg-zinc-100 transition-colors sm:hidden"
                    aria-label="Закрыть"
                  >
                    <Icon icon={X} size="sm" className="text-zinc-400" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 mb-3 sm:mb-4">
                  Для корректной работы сервиса и улучшения вашего опыта мы используем 
                  файлы cookies. Продолжая использовать сайт, вы соглашаетесь с нашей{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Политикой конфиденциальности
                  </Link>.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAccept}
                    size="sm"
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm"
                  >
                    Принять все
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDecline}
                    className="border-zinc-300 text-xs sm:text-sm"
                  >
                    Только необходимые
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDecline}
                className="hidden sm:block flex-shrink-0 p-1 rounded-full hover:bg-zinc-100 transition-colors"
                aria-label="Закрыть"
              >
                <Icon icon={X} size="sm" className="text-zinc-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
