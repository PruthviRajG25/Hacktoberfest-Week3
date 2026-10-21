import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border bg-card p-5 shadow-sm ${className}`}>{children}</section>
}

export function Loading({ label = 'Loading\u2026' }: { label?: string }) {
  return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{label}</div>
}

export function ErrorState({ message = 'Something went wrong.' }: { message?: string }) {
  return <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{message}</div>
}

export function Button({
  children, onClick, type = 'button', disabled = false, variant = 'primary', className = '', title,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
  title?: string
}) {
  const styles: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'border bg-background hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// ── Toast Notification ─────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
}

let _addToast: ((message: string, variant?: ToastVariant) => void) | null = null

/** Imperative toast helper — call from anywhere after <ToastContainer /> is mounted. */
export function toast(message: string, variant: ToastVariant = 'success') {
  _addToast?.(message, variant)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    _addToast = (message, variant = 'success') => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, message, variant }])
      timers.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        delete timers.current[id]
      }, 3500)
    }
    return () => {
      _addToast = null
    }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur animate-fade-in',
            t.variant === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : t.variant === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
              : 'border-primary/20 bg-primary/5 text-primary',
          ].join(' ')}
        >
          {t.variant === 'success'
            ? <CheckCircle2 size={16} className="shrink-0" />
            : <XCircle size={16} className="shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Badge ──────────────────────────────────────────────────────────────────────

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const styles: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-muted-foreground/50">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
