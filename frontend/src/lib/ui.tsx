import type { ReactNode } from 'react'

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

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{label}</div>
}

export function ErrorState({ message = 'Something went wrong.' }: { message?: string }) {
  return <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{message}</div>
}

export function Button({ children, onClick, type = 'button', disabled = false, variant = 'primary' }: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'border bg-background hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }
  return <button type={type} onClick={onClick} disabled={disabled} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}>{children}</button>
}
