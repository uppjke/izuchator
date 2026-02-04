'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Input component with mobile-first design
 * - 48px height on mobile (44px minimum touch target + padding)
 * - 40px height on desktop
 * - 16px font size on mobile to prevent iOS zoom on focus
 */
export function Input(
  { className, type, ...props }: React.ComponentProps<'input'>
) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* ── Mobile-first base styles ─────────────────────── */
        'flex w-full min-w-0',
        'h-12 sm:h-10', // 48px mobile, 40px desktop
        'rounded-xl sm:rounded-full', // More rectangular on mobile for easier tapping
        'border border-input',
        'bg-white',
        'px-4 py-2',
        'text-base', // 16px to prevent iOS zoom
        'placeholder:text-muted-foreground',
        'transition-colors duration-200 outline-none',
        
        /* ── Touch optimization ────────────────────────────── */
        'touch-manipulation', // Disable double-tap zoom on input
        
        /* ── Focus state ─────────────────────────────────── */
        'focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900',

        /* ── Error state ─────────────────────────────────── */
        'aria-invalid:border-destructive',
        'aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive',

        /* ── Disabled state ──────────────────────────────── */
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-100',

        /* ── File input styles ───────────────────────────── */
        'file:inline-flex file:h-8 file:border-0 file:bg-zinc-100',
        'file:text-sm file:font-medium file:text-foreground file:rounded-lg',
        'file:mr-3 file:px-3',

        className
      )}
      {...props}
    />
  )
}

/**
 * Textarea component with mobile-first design
 */
export function Textarea(
  { className, ...props }: React.ComponentProps<'textarea'>
) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        /* ── Base styles ──────────────────────────────────── */
        'flex w-full min-w-0',
        'min-h-[120px]',
        'rounded-xl',
        'border border-input',
        'bg-white',
        'px-4 py-3',
        'text-base',
        'placeholder:text-muted-foreground',
        'transition-colors duration-200 outline-none',
        'resize-none', // Prevent resize on mobile
        
        /* ── Focus state ─────────────────────────────────── */
        'focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900',

        /* ── Error state ─────────────────────────────────── */
        'aria-invalid:border-destructive',
        'aria-invalid:focus-visible:border-destructive',

        /* ── Disabled state ──────────────────────────────── */
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-100',

        className
      )}
      {...props}
    />
  )
}