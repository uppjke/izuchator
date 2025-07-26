'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/header'

export function ConditionalHeaderWrapper() {
  const pathname = usePathname()
  
  // Не показываем Header на страницах дашборда
  if (pathname.startsWith('/dashboard')) {
    return null
  }
  
  return <Header />
}
