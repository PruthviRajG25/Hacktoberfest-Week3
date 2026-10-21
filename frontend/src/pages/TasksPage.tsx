import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Circle } from 'lucide-react'
import { listTasks, updateTask } from '@/lib/api-client'
import { Button, Card, ErrorState, Loading, PageHeader } from '@/lib/ui'

export function TasksPage() {
  const queryClient = useQueryClient()
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => listTasks({ limit: 100 }) })
  const update = useMutation({ mutationFn: (id: string) => updateTask(id, { status: 'completed' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }) })
  return <><PageHeader title="Tasks" description="Review action items extracted from your documents." />{tasks.isLoading ? <Loading /> : tasks.error ? <ErrorState message="Tasks could not be loaded." /> : <Card><div className="divide-y">{tasks.data?.tasks.map((task) => <div key={task.id} className="flex gap-3 py-4 first:pt-0 last:pb-0"><div className="mt-0.5 text-primary">{task.status === 'completed' ? <Check size={18} /> : <Circle size={18} />}</div><div className="flex-1"><p className={task.status === 'completed' ? 'text-muted-foreground line-through' : 'font-medium'}>{task.description}</p><p className="mt-1 text-xs text-muted-foreground">{task.priority} priority · {task.deadline ? `Due ${task.deadline}` : 'No deadline'} · {Math.round(task.confidence * 100)}% confidence</p></div>{task.status === 'active' && <Button variant="secondary" onClick={() => update.mutate(task.id)} disabled={update.isPending}>Complete</Button>}</div>)}{!tasks.data?.tasks.length && <p className="py-6 text-center text-sm text-muted-foreground">No extracted tasks yet.</p>}</div></Card>}</>
}
