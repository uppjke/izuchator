'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster 
      position="top-center"
      richColors
      duration={2000}
      toastOptions={{
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'white',
          color: '#111827',
          border: '1px solid #e5e7eb',
          borderRadius: '18px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(8px)',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          lineHeight: '1.4',
        },
      }}
    />
  )
}
