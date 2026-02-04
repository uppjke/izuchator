'use client'

import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ConsentCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: boolean
  disabled?: boolean
  className?: string
}

export function ConsentCheckbox({ 
  checked, 
  onCheckedChange, 
  error,
  disabled,
  className 
}: ConsentCheckboxProps) {
  return (
    <label 
      className={cn(
        "flex items-start gap-3 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "mt-0.5 shrink-0",
          error && "border-red-500"
        )}
      />
      <span 
        className={cn(
          "text-sm text-zinc-600 leading-relaxed",
          error && "text-red-600"
        )}
      >
        Я принимаю{' '}
        <Link 
          href="/terms" 
          target="_blank"
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Пользовательское соглашение
        </Link>{' '}
        и даю согласие на обработку персональных данных в соответствии с{' '}
        <Link 
          href="/privacy" 
          target="_blank"
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Политикой конфиденциальности
        </Link>
      </span>
    </label>
  )
}

interface AgeConsentCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: boolean
  disabled?: boolean
  className?: string
}

export function AgeConsentCheckbox({ 
  checked, 
  onCheckedChange, 
  error,
  disabled,
  className 
}: AgeConsentCheckboxProps) {
  return (
    <label 
      className={cn(
        "flex items-start gap-3 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "mt-0.5 shrink-0",
          error && "border-red-500"
        )}
      />
      <span 
        className={cn(
          "text-sm text-zinc-600 leading-relaxed",
          error && "text-red-600"
        )}
      >
        Мне исполнилось 14 лет, либо я использую сервис с согласия родителей или законных представителей
      </span>
    </label>
  )
}
