import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Нормализует email адрес:
 * - Приводит к нижнему регистру
 * - Убирает пробелы
 * - Унифицирует алиасы популярных почтовых сервисов
 * 
 * Поддерживаемые нормализации:
 * - Яндекс: ya.ru, yandex.com → yandex.ru
 * - Google: googlemail.com → gmail.com
 */
export function normalizeEmail(email: string): string {
  const normalized = email.toLowerCase().trim()
  const [localPart, domain] = normalized.split('@')
  
  if (!localPart || !domain) return normalized
  
  // Нормализация доменов
  const domainAliases: Record<string, string> = {
    'ya.ru': 'yandex.ru',
    'yandex.com': 'yandex.ru',
    'googlemail.com': 'gmail.com',
  }
  
  const normalizedDomain = domainAliases[domain] || domain
  
  return `${localPart}@${normalizedDomain}`
}
