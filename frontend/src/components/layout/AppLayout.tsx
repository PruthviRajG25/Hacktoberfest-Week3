import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, CheckSquare, FileText, LayoutDashboard, ListChecks, Menu, Moon, Settings, Sun, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAIStatus } from '@/lib/api-client'
import { ToastContainer } from '@/lib/ui'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/files', label: 'Files', icon: FileText },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/action-plans', label: 'Action plans', icon: ListChecks },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const location = useLocation()
  const aiStatus = useQuery({ queryKey: ['ai-status'], queryFn: getAIStatus, refetchInterval: 30000 })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = window.localStorage.getItem('sloth-stack-theme')
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    window.localStorage.setItem('sloth-stack-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const navigationLinks = navigation.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-accent font-medium text-accent-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  ))

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <img src="/sloth-stack-logo.png" alt="Sloth Stack logo" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="font-semibold tracking-tight">Sloth Stack</p>
              <p className="text-xs text-muted-foreground">Local-first productivity</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
            {navigationLinks}
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    aiStatus.isLoading
                      ? 'bg-muted-foreground animate-pulse-soft'
                      : aiStatus.data?.ollama_available
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                  title={aiStatus.data?.error ?? undefined}
                />
                {aiStatus.isLoading
                  ? 'Checking AI…'
                  : aiStatus.data?.ollama_available
                  ? `${aiStatus.data.configured_model} ready`
                  : 'Ollama offline'}
              </div>
              <button
                type="button"
                onClick={() => setIsDark((c) => !c)}
                className="rounded-md p-1.5 transition-colors hover:bg-muted hover:text-foreground"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            {/* Mobile burger */}
            <div className="lg:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((o) => !o)}
                  className="rounded-lg border bg-background p-2 hover:bg-muted"
                  aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={isMenuOpen}
                >
                  {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <img src="/sloth-stack-logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
                <p className="font-semibold">Sloth Stack</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {/* Ollama status pill — shown in header on mobile */}
              {!aiStatus.isLoading && !aiStatus.data?.ollama_available && (
                <span className="hidden rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400 sm:inline-flex">
                  Ollama offline — analysis unavailable
                </span>
              )}
              <p className="hidden text-sm text-muted-foreground sm:block">Your files stay on this machine.</p>
              <button
                type="button"
                onClick={() => setIsDark((c) => !c)}
                className="rounded-lg border bg-background p-2 transition-colors hover:bg-muted"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile nav drawer */}
        {isMenuOpen && (
          <nav className="border-b bg-card px-4 py-3 lg:hidden" aria-label="Mobile navigation">
            <div className="mx-auto max-w-7xl space-y-1">{navigationLinks}</div>
          </nav>
        )}

        <div className="mx-auto max-w-7xl p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Global toast notifications */}
      <ToastContainer />
    </div>
  )
}
