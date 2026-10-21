import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Check, Eraser, PenLine, Save, Sparkles, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveAction, listActionPlans, rejectAction } from '@/lib/api-client'
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, toast } from '@/lib/ui'
import { formatActionType, formatDateTime, statusColor } from '@/lib/utils'

const NOTEBOOK_KEY = 'sloth-stack-action-notebook'

function actionStatusBadge(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (status === 'succeeded') return 'success'
  if (status === 'pending_approval') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'executing') return 'info'
  return 'default'
}

export function ActionPlansPage() {
  const queryClient = useQueryClient()
  const plans = useQuery({
    queryKey: ['action-plans'],
    queryFn: () => listActionPlans({ limit: 100 }),
    refetchInterval: 10000,
  })

  const change = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      approve ? approveAction(id) : rejectAction(id),
    onSuccess: (action, vars) => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      if (vars.approve) {
        toast(action.status === 'succeeded' ? 'Action approved and executed.' : 'Action approved.', 'success')
      } else {
        toast('Action rejected.', 'info')
      }
    },
    onError: (_err, vars) =>
      toast(
        vars.approve
          ? 'Could not approve action. Check the backend is running.'
          : 'Could not reject action.',
        'error',
      ),
  })

  // ── Planning notebook ────────────────────────────────────────────────────────
  const canvas = useRef<HTMLCanvasElement>(null)
  const [note, setNote] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(NOTEBOOK_KEY)
    if (saved) setNote(saved)
    const ctx = canvas.current?.getContext('2d')
    if (ctx) {
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#9b6cff'
    }
  }, [])

  function startDrawing(e: PointerEvent<HTMLCanvasElement>) {
    const target = canvas.current
    if (!target) return
    target.setPointerCapture(e.pointerId)
    const rect = target.getBoundingClientRect()
    const ctx = target.getContext('2d')
    ctx?.beginPath()
    ctx?.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setDrawing(true)
  }

  function draw(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const target = canvas.current
    const ctx = target?.getContext('2d')
    if (!target || !ctx) return
    const rect = target.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  function clearCanvas() {
    const target = canvas.current
    target?.getContext('2d')?.clearRect(0, 0, target.width, target.height)
  }

  function saveNotes() {
    window.localStorage.setItem(NOTEBOOK_KEY, note)
    setNoteSaved(true)
    toast('Notes saved.')
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const pendingActions = plans.data?.plans.flatMap((p) => p.actions.filter((a) => a.status === 'pending_approval')) ?? []

  return (
    <>
      <PageHeader
        title="Action plans"
        description="Review AI-proposed actions, approve safe operations, and plan your next steps."
        action={
          pendingActions.length > 0 ? (
            <Badge variant="warning">{pendingActions.length} awaiting approval</Badge>
          ) : undefined
        }
      />

      {/* ── Planning notebook ── */}
      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Planning notebook</h2>
            <p className="mt-1 text-sm text-muted-foreground">Type a plan or sketch a flow. Notes are saved in this browser.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearCanvas}>
              <Eraser size={15} className="mr-1 inline" />Clear drawing
            </Button>
            <Button onClick={saveNotes}>
              <Save size={15} className="mr-1 inline" />
              {noteSaved ? 'Saved!' : 'Save notes'}
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <textarea
            className="min-h-48 w-full resize-y rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Write milestones, owners, and next steps…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Planning notes"
          />
          <div className="rounded-lg border bg-background">
            <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
              <PenLine size={14} />Draw your plan
            </div>
            <canvas
              ref={canvas}
              width={700}
              height={260}
              className="h-64 w-full touch-none cursor-crosshair"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={() => setDrawing(false)}
              onPointerLeave={() => setDrawing(false)}
              aria-label="Drawing canvas"
            />
          </div>
        </div>
      </Card>

      {/* ── Action plans list ── */}
      {plans.isLoading ? (
        <Loading />
      ) : plans.error ? (
        <ErrorState message="Action plans could not be loaded. Make sure the backend is running on port 8000." />
      ) : (
        <div className="space-y-5">
          {plans.data?.plans.map((plan) => (
            <Card key={plan.id}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">Plan {plan.id.slice(0, 8)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {plan.status} · Created {formatDateTime(plan.created_at)}
                  </p>
                </div>
                <Badge variant={plan.actions.some((a) => a.status === 'pending_approval') ? 'warning' : 'default'}>
                  {plan.actions.filter((a) => a.status === 'pending_approval').length} pending
                </Badge>
              </div>
              <div className="divide-y">
                {plan.actions.map((action) => (
                  <div key={action.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{action.description}</p>
                          <Badge variant={actionStatusBadge(action.status)}>{action.status}</Badge>
                          <Badge variant="default">{formatActionType(action.action_type)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{action.rationale}</p>
                        {action.error_message && (
                          <p className="mt-1 text-xs text-destructive">{action.error_message}</p>
                        )}
                      </div>
                      {action.status === 'pending_approval' && (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            onClick={() => change.mutate({ id: action.id, approve: true })}
                            disabled={change.isPending}
                          >
                            <Check size={15} className="mr-1 inline" />Approve
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => change.mutate({ id: action.id, approve: false })}
                            disabled={change.isPending}
                          >
                            <X size={15} className="mr-1 inline" />Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {!plans.data?.plans.length && (
            <Card>
              <EmptyState
                icon={<Sparkles size={40} />}
                title="No action plans yet"
                description="Analyze a file from the Files page to generate an action plan."
              />
            </Card>
          )}
        </div>
      )}
    </>
  )
}
