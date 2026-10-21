import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No date'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-500'
    case 'medium': return 'text-amber-500'
    case 'low': return 'text-green-500'
    default: return 'text-muted-foreground'
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'succeeded':
    case 'parsed':
    case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'running':
    case 'queued':
    case 'executing':
    case 'generating': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'failed':
    case 'parse_failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'pending_approval': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'rejected': return 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
  }
}

export function categoryIcon(category: string | null): string {
  switch (category) {
    case 'work': return '💼'
    case 'personal': return '👤'
    case 'finance': return '💰'
    case 'health': return '❤️'
    case 'learning': return '📚'
    case 'legal': return '⚖️'
    case 'reference': return '📖'
    case 'archive': return '🗃️'
    default: return '📄'
  }
}

export function formatActionType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
