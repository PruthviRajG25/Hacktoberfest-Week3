import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, FileText, ListChecks, Sparkles, Timer, Upload } from 'lucide-react'
import { getAnalysis, getBriefing, generateBriefing, listActionPlans, listFiles, listTasks, startAnalysis, uploadFile } from '@/lib/api-client'
import { Button, Card, ErrorState, Loading, PageHeader } from '@/lib/ui'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const files = useQuery({ queryKey: ['files'], queryFn: () => listFiles({ limit: 100 }) })
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => listTasks({ limit: 100 }) })
  const plans = useQuery({ queryKey: ['action-plans'], queryFn: () => listActionPlans({ limit: 100 }) })
  const briefing = useQuery({
    queryKey: ['briefing'],
    queryFn: getBriefing,
    refetchInterval: (query) => query.state.data?.status === 'generating' ? 2000 : false,
  })
  const generate = useMutation({
    mutationFn: generateBriefing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing'] }),
  })
  const upload = useMutation({
    mutationFn: uploadFile,
    onSuccess: async (file) => {
      const job = await startAnalysis(file.id)
      setAnalysisId(job.id)
      queryClient.invalidateQueries({ queryKey: ['files'] })
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
    if (analysis.data && ['completed', 'failed', 'cancelled'].includes(analysis.data.status)) {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['action-plans'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    }
  }, [analysis.data, queryClient])

  const error = files.error || tasks.error || plans.error || upload.error
  const uploadStatus = upload.isPending
    ? 'Uploading and starting analysis…'
    : analysis.data?.status === 'running' || analysis.data?.status === 'queued'
      ? 'Analyzing inbox and extracting tasks…'
      : analysis.data?.status === 'completed'
        ? 'Analysis completed. Tasks and action plans were refreshed.'
        : analysis.data?.status === 'failed'
          ? analysis.data.error_message || 'Analysis failed. Check Ollama and try again.'
          : null
  return (
    <>
      <PageHeader title="Good morning" description="A clear view of your local productivity workspace." action={<div className="flex flex-wrap gap-2"><input ref={fileInput} className="hidden" type="file" accept=".txt,.md,.pdf,.json,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = '' }} /><Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={upload.isPending}><Upload size={16} className="mr-2 inline" />{upload.isPending ? 'Uploading…' : 'Upload and analyze'}</Button><Button onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? 'Generating…' : 'Generate briefing'}</Button></div>} />
      {error && <ErrorState message={upload.error ? 'Upload or analysis could not be started. Check the file type, backend, and Ollama status.' : 'The dashboard could not load all data. Check that the backend is running.'} />}
      {uploadStatus && <p className={`mb-4 rounded-lg border p-3 text-sm ${analysis.data?.status === 'failed' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5 text-primary'}`}><Brain size={15} className="mr-2 inline" />{uploadStatus}</p>}
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
          {briefing.isLoading ? <Loading /> : briefing.error ? <ErrorState message="The briefing could not be loaded. Check that the backend is running." /> : briefing.data?.status === 'generating' ? <Loading label="Generating your briefing…" /> : briefing.data?.status === 'failed' ? <ErrorState message={briefing.data.error_message || 'Briefing generation failed. Check Ollama status and try again.'} /> : briefing.data ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{briefing.data.content || 'Briefing is ready.'}</p> : <p className="mt-4 text-sm text-muted-foreground">Generate a briefing to summarize recent documents and tasks.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">How Sloth Stack works</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li><span className="mr-2 font-medium text-primary">1.</span>Upload and analyze a mail export or supported document.</li>
            <li><span className="mr-2 font-medium text-primary">2.</span>Analyze them with your local Ollama model.</li>
            <li><span className="mr-2 font-medium text-primary">3.</span>Review and approve proposed actions.</li>
          </ol>
        </Card>
      </div>
    </>
  )
}
