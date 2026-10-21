import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, ListChecks, Sparkles, Timer } from 'lucide-react'
import { getBriefing, generateBriefing, listActionPlans, listFiles, listTasks } from '@/lib/api-client'
import { Button, Card, ErrorState, Loading, PageHeader } from '@/lib/ui'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const files = useQuery({ queryKey: ['files'], queryFn: () => listFiles({ limit: 100 }) })
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => listTasks({ limit: 100 }) })
  const plans = useQuery({ queryKey: ['action-plans'], queryFn: () => listActionPlans({ limit: 100 }) })
  const briefing = useQuery({ queryKey: ['briefing'], queryFn: getBriefing })
  const generate = useMutation({
    mutationFn: generateBriefing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing'] }),
  })

  const error = files.error || tasks.error || plans.error
  return (
    <>
      <PageHeader title="Good morning" description="A clear view of your local productivity workspace." action={<Button onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? 'Generating…' : 'Generate briefing'}</Button>} />
      {error && <ErrorState message="The dashboard could not load all data. Check that the backend is running." />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ['Files', files.data?.total ?? '—', FileText],
          ['Open tasks', tasks.data?.tasks.filter((task) => task.status === 'active').length ?? '—', ListChecks],
          ['Action plans', plans.data?.total ?? '—', Sparkles],
          ['Due soon', tasks.data?.tasks.filter((task) => task.deadline).length ?? '—', Timer],
        ] as const).map(([label, value, Icon]) => (
          <Card key={String(label)}><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon size={18} className="text-primary" /></div><p className="mt-3 text-3xl font-semibold">{value}</p></Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-semibold">Daily briefing</h2>
          {briefing.isLoading ? <Loading /> : briefing.data ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{briefing.data.content || briefing.data.error_message || 'Briefing is being generated.'}</p> : <p className="mt-4 text-sm text-muted-foreground">Generate a briefing to summarize recent documents and tasks.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">How LazyOps works</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li><span className="mr-2 font-medium text-primary">1.</span>Upload supported files.</li>
            <li><span className="mr-2 font-medium text-primary">2.</span>Analyze them with your local Ollama model.</li>
            <li><span className="mr-2 font-medium text-primary">3.</span>Review and approve proposed actions.</li>
          </ol>
        </Card>
      </div>
    </>
  )
}
