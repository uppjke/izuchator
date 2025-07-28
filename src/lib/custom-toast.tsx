'use client'

import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'

interface CustomToastProps {
  message: string
  icon?: string
  duration?: number
  onClose: () => void
}

function CustomToast({ message, icon, duration = 2000, onClose }: CustomToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Дождаться завершения анимации
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      style={{
        zIndex: 2147483647,
        fontSize: '14px',
        fontWeight: 500,
        maxWidth: '200px',
        width: 'fit-content',
      }}
    >
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span>{message}</span>
      </div>
    </div>,
    document.body
  )
}

let toastId = 0
const activeToasts = new Map<number, () => void>()

export function showCustomToast(message: string, icon?: string, duration?: number) {
  const id = ++toastId
  
  // Убираем предыдущие toast'ы
  activeToasts.forEach(removeToast => removeToast())
  activeToasts.clear()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const removeToast = () => {
    activeToasts.delete(id)
    container.remove()
  }

  activeToasts.set(id, removeToast)

  const root = createRoot(container)
  
  root.render(
    <CustomToast
      message={message}
      icon={icon}
      duration={duration}
      onClose={removeToast}
    />
  )
}
