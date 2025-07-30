'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      expand={false}
      richColors
      closeButton={false}
      duration={2000}
      toastOptions={{
        style: {
          background: 'white',
          color: '#111827',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          minWidth: 'auto',
          width: 'fit-content',
          maxWidth: 'min(320px, 80vw)', // Адаптивная ширина: до 320px на десктопе, до 80% экрана на мобильных
          whiteSpace: 'nowrap', // Предотвращаем перенос текста
          overflow: 'hidden',
          textOverflow: 'ellipsis', // Добавляем многоточие если текст все же не помещается
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: '2147483647',
          // Строгое центрирование
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          marginLeft: '0',
          marginRight: '0',
        },
        className: 'toast-center',
      }}
      style={{
        zIndex: 2147483647,
      }}
    />
  )
}
