'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input(
  { className, type, ...props }: React.ComponentProps<'input'>
) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* ── базовые ─────────────────────────── */
        'flex h-9 w-full min-w-0 rounded-full border border-input',
        'bg-transparent px-3 py-1 text-base md:text-sm',
        'placeholder:text-muted-foreground',
        'transition-colors outline-none',

        /* ── focus-ring (заменяет границу) ─ */
        'focus-visible:border-blue-500',

        /* ── error-state ─────────────────────── */
        'aria-invalid:border-destructive',
        'aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:border-[1.5px] aria-invalid:focus-visible:px-[11.5px]',

        /* ── disabled ────────────────────────── */
        'disabled:cursor-not-allowed disabled:opacity-50',

        /* ── file-input стили (если понадобится) */
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent',
        'file:text-sm file:font-medium file:text-foreground',

        className
      )}
      {...props}
    />
  )
}