import { useQuery } from '@tanstack/react-query'
import { getActivity } from '@/lib/api-client'
import { Card, ErrorState, Loading, PageHeader } from '@/lib/ui'

export function ActivityPage() {
  const activity = useQuery({ queryKey: ['activity'], queryFn: () => getActivity({ limit: 100 }) })
  return <><PageHeader title="Activity" description="A transparent record of uploads, analysis, and approved actions." />{activity.isLoading ? <Loading /> : activity.error ? <ErrorState message="Activity could not be loaded." /> : <Card><div className="divide-y">{activity.data?.events.map((event) => <div key={event.id} className="py-4 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">{event.description}</p><p className="mt-1 text-xs text-muted-foreground">{event.event_type} · {event.actor}</p></div><time className="shrink-0 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time></div></div>)}{!activity.data?.events.length && <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>}</div></Card>}</>
}
