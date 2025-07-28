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
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          minWidth: 'auto',
          width: 'fit-content',
          maxWidth: '200px',
          zIndex: '2147483647',
        },
        className: 'toast-center',
      }}
      style={{
        zIndex: 2147483647,
      }}
    />
  )
}
