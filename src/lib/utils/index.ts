import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale = 'tr-TR'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date, locale = 'tr-TR'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date: string | Date, locale = 'tr-TR'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatCurrency(amount: number, currency = 'TRY', locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatNumber(value: number, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercentage(value: number, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function formatRelativeTime(date: string | Date, locale = 'tr-TR'): string {
  const now = new Date()
  const target = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second')
  }
  if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  }
  if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  }
  if (diffInSeconds < 604800) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  }
  if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 604800), 'week')
  }

  return formatDate(date, locale)
}

export function calculateAge(birthDate: string | Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

export function calculateLevel(xp: number): number {
  // Level formula: each level requires more XP
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, etc.
  // Formula: XP required = 50 * level^2
  let level = 1
  let totalXpRequired = 0

  while (totalXpRequired <= xp) {
    level++
    totalXpRequired += 50 * level * level
  }

  return level - 1
}

export function calculateXpForLevel(level: number): number {
  let totalXp = 0
  for (let i = 2; i <= level; i++) {
    totalXp += 50 * i * i
  }
  return totalXp
}

export function calculateXpProgress(xp: number): { current: number; required: number; percentage: number } {
  const currentLevel = calculateLevel(xp)
  const currentLevelXp = calculateXpForLevel(currentLevel)
  const nextLevelXp = calculateXpForLevel(currentLevel + 1)
  const xpInCurrentLevel = xp - currentLevelXp
  const xpRequiredForNextLevel = nextLevelXp - currentLevelXp

  return {
    current: xpInCurrentLevel,
    required: xpRequiredForNextLevel,
    percentage: Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100),
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

export function truncate(text: string, length: number, suffix = '...'): string {
  if (text.length <= length) return text
  return text.substring(0, length - suffix.length) + suffix
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone: string): boolean {
  // Turkish phone number validation
  const re = /^(\+90|0)?[5][0-9]{9}$/
  return re.test(phone.replace(/\s/g, ''))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key])
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}
