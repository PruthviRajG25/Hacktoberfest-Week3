import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight, Check, Circle, FileText, Flame, ListChecks, Sparkles, Target, Timer, Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  getAnalysis, getBriefing, generateBriefing, listActionPlans, listFiles, listTasks,
  startAnalysis, updateTask, uploadFile,
} from '@/lib/api-client'
import type { ExtractedTask } from '@/lib/types'
import { Badge, Button, Card, ErrorState, Loading, PageHeader, toast } from '@/lib/ui'

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const match = part.match(/^\*\*(.+)\*\*$/)
    return match
      ? <strong key={`${part}-${index}`}>{match[1]}</strong>
      : <span key={`${part}-${index}`}>{part}</span>
  })
}

function renderBriefing(content: string) {
  return content.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={`blank-${index}`} className="h-2" />
    const heading = trimmed.match(/^(?:#{1,6}\s+|\*\*)([^*#]+?)(?:\*\*)?$/)
    if (heading) return <h3 key={`heading-${index}`} className="mt-3 font-semibold text-foreground">{heading[1].trim()}</h3>
    const item = trimmed.match(/^(?:\d+\.\s+|[-*]\s+)(.+)$/)
    if (item) return <li key={`item-${index}`} className="ml-5 pl-1">{renderInlineMarkdown(item[1])}</li>
    return <p key={`paragraph-${index}`}>{renderInlineMarkdown(trimmed)}</p>
  })
}

function TaskRow({ task, onComplete }: { task: ExtractedTask; onComplete: () => void }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl border bg-background/70 p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
      <button
        type="button"
        onClick={onComplete}
        className="mt-0.5 rounded-full text-muted-foreground transition hover:text-emerald-600"
        aria-label={`Complete ${task.description}`}
      >
        <Circle size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{task.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}>{task.priority} priority</Badge>
          {task.deadline_raw && <span><Timer size={12} className="mr-1 inline" />{task.deadline_raw}</span>}
        </div>
      </div>
      <ArrowRight size={16} className="mt-1 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
    </div>
  )
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const briefingAnalysisId = useRef<string | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const files = useQuery({ queryKey: ['files'], queryFn: () => listFiles({ limit: 100 }) })
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => listTasks({ status: 'active', limit: 100 }) })
  const plans = useQuery({ queryKey: ['action-plans'], queryFn: () => listActionPlans({ limit: 100 }) })
  const briefing = useQuery({
    queryKey: ['briefing'],
    queryFn: getBriefing,
    refetchInterval: (query) => query.state.data?.status === 'generating' ? 2000 : false,
  })
  const generate = useMutation({
    mutationFn: generateBriefing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing'] }),
    onError: () => toast('Report generation failed. Check Ollama status.', 'error'),
  })
  const upload = useMutation({
    mutationFn: uploadFile,
    onSuccess: async (file) => {
      const job = await startAnalysis(file.id)
      setAnalysisId(job.id)
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast('Mission started — extracting tasks from your file.')
    },
    onError: () => toast('Upload or analysis could not be started.', 'error'),
  })
  const complete = useMutation({
    mutationFn: (task: ExtractedTask) => updateTask(task.id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast('Task complete — streak extended!')
    },
  })
  const analysis = useQuery({
    queryKey: ['dashboard-analysis', analysisId],
    queryFn: () => getAnalysis(analysisId as string),
    enabled: Boolean(analysisId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && !['completed', 'failed', 'cancelled'].includes(status) ? 2000 : false
    },
  })

  useEffect(() => {
    if (!analysis.data || !['completed', 'failed', 'cancelled'].includes(analysis.data.status)) return
    queryClient.invalidateQueries({ queryKey: ['files'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['action-plans'] })
    if (analysis.data.status === 'completed' && briefingAnalysisId.current !== analysis.data.id) {
      briefingAnalysisId.current = analysis.data.id
      generate.mutate()
    }
  }, [analysis.data, generate, queryClient])

  const activeTasks = tasks.data?.tasks ?? []
  const completedCount = Math.max(0, (files.data?.total ?? 0) - activeTasks.length)
  const missionProgress = files.data?.total ? Math.min(100, Math.round((completedCount / Math.max(files.data.total, 1)) * 100)) : 0
  const analysisRunning = upload.isPending || ['queued', 'running'].includes(analysis.data?.status ?? '')
  const error = files.error || tasks.error || plans.error || upload.error

  return (
    <>
      <PageHeader
        title="Your mission board"
        description="Drop in a briefing, turn it into missions, and clear your queue one win at a time."
        action={(
          <>
            <input ref={fileInput} className="hidden" type="file" accept=".txt,.md,.pdf,.json,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = '' }} />
            <Button onClick={() => fileInput.current?.click()} disabled={analysisRunning}>
              <Upload size={16} className="mr-2 inline" />{analysisRunning ? 'Reading file…' : 'Start a mission'}
            </Button>
          </>
        )}
      />
      {error && <ErrorState message="The mission board could not complete that step. Check the backend and Ollama status." />}

      <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary"><Flame size={17} /> Focus streak</div>
            <h2 className="mt-2 text-2xl font-semibold">Make progress visible.</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">Upload a mail export or document and we’ll parse the work, create tasks, and write your report automatically.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative grid h-20 w-20 place-items-center rounded-full border-8 border-primary/20 bg-background">
              <span className="text-xl font-bold">{missionProgress}%</span>
            </div>
            <div><p className="text-sm font-medium">Mission progress</p><p className="text-xs text-muted-foreground">{activeTasks.length} tasks waiting</p></div>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${missionProgress}%` }} /></div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ['Files parsed', files.data?.total ?? '—', FileText],
          ['Missions waiting', activeTasks.length, ListChecks],
          ['Reports created', plans.data?.total ?? '—', Sparkles],
          ['Due dates', activeTasks.filter((task) => task.deadline).length, Target],
        ] as Array<[string, string | number, LucideIcon]>).map(([label, value, Icon]) => (
          <Card key={String(label)}><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon size={18} className="text-primary" /></div><p className="mt-3 text-3xl font-semibold">{value}</p></Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Next missions</h2><p className="mt-1 text-xs text-muted-foreground">Complete a mission to keep your board clear.</p></div><ListChecks className="text-primary" size={20} /></div>
          {tasks.isLoading ? <Loading label="Loading missions…" /> : activeTasks.length ? <div className="mt-4 space-y-3">{activeTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} onComplete={() => complete.mutate(task)} />)}</div> : <div className="mt-5 rounded-xl border border-dashed p-6 text-center"><Check className="mx-auto text-emerald-500" /><p className="mt-2 font-medium">Board clear!</p><p className="mt-1 text-sm text-muted-foreground">Upload a file to generate your next missions.</p></div>}
        </Card>
        <Card>
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Latest report</h2><p className="mt-1 text-xs text-muted-foreground">A readable summary of what your files contain.</p></div><Sparkles className="text-primary" size={20} /></div>
          {briefing.isLoading ? <Loading /> : briefing.data?.status === 'generating' || generate.isPending ? <Loading label="Writing your report…" /> : briefing.data?.status === 'failed' ? <ErrorState message={briefing.data.error_message || 'Report generation failed.'} /> : briefing.data?.content ? <div className="mt-4 max-h-80 overflow-auto space-y-2 text-sm leading-6 text-muted-foreground">{renderBriefing(briefing.data.content)}</div> : <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Your report will appear here after the first file is analyzed.</p>}
        </Card>
      </div>
    </>
  )
}
