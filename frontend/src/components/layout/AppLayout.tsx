import { NavLink, Outlet } from 'react-router-dom'
import { Activity, CheckSquare, FileText, LayoutDashboard, ListChecks, Settings, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAIStatus } from '@/lib/api-client'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/files', label: 'Files', icon: FileText },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/action-plans', label: 'Action plans', icon: ListChecks },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const aiStatus = useQuery({ queryKey: ['ai-status'], queryFn: getAIStatus, refetchInterval: 30000 })

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="font-semibold tracking-tight">LazyOps AI</p>
              <p className="text-xs text-muted-foreground">Local-first automation</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
            {navigation.map(({ to, label, icon: Icon, end }) => (
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
            ))}
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${aiStatus.data?.ollama_available ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {aiStatus.data?.ollama_available ? 'Ollama connected' : 'Ollama offline'}
            </div>
          </div>
        </div>
      </aside>
      <main className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="lg:hidden">
              <p className="font-semibold">LazyOps AI</p>
            </div>
            <p className="ml-auto text-sm text-muted-foreground">Your files stay on this machine.</p>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
