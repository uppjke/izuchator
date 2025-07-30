'use client'

import { toast } from 'sonner'

export function showCustomToast(message: string, icon?: string, duration?: number) {
  // Определяем тип уведомления по иконке
  const messageWithIcon = icon ? `${icon} ${message}` : message
  
  if (icon === '✅') {
    toast.success(message, {
      duration: duration || 2000,
    })
  } else if (icon === '❌') {
    toast.error(message, {
      duration: duration || 2000,
    })
  } else if (icon === '⚠️') {
    toast.warning(message, {
      duration: duration || 2000,
    })
  } else if (icon === 'ℹ️') {
    toast.info(message, {
      duration: duration || 2000,
    })
  } else {
    toast(messageWithIcon, {
      duration: duration || 2000,
    })
  }
}
