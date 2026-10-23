import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Mail, MessageCircle, Users } from 'lucide-react'
import { getSettings, updateSettings } from '@/lib/api-client'
import { Button, Card, ErrorState, Loading, PageHeader } from '@/lib/ui'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [model, setModel] = useState('')
  const [url, setUrl] = useState('')
  const [limit, setLimit] = useState('')
  const [openedIntegration, setOpenedIntegration] = useState<string | null>(null)
  useEffect(() => { if (settings.data) { setModel(settings.data.ollama_model); setUrl(settings.data.ollama_base_url); setLimit(String(settings.data.max_upload_size_mb)) } }, [settings.data])
  const save = useMutation({ mutationFn: () => updateSettings({ ollama_model: model, ollama_base_url: url, max_upload_size_mb: Number(limit) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }) })
  const openIntegration = (name: string, url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpenedIntegration(name)
  }

  return (
    <>
      <PageHeader title="Settings" description="Configure local inference, safe upload limits, and messaging links." />
      {settings.isLoading ? <Loading /> : settings.error ? <ErrorState message="Settings could not be loaded." /> : (
        <div className="space-y-6">
          <Card>
            <form className="max-w-xl space-y-5" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
              <label className="block text-sm font-medium">Ollama base URL<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
              <label className="block text-sm font-medium">Model name<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={model} onChange={(event) => setModel(event.target.value)} /></label>
              <label className="block text-sm font-medium">Maximum upload size (MB)<input type="number" min="1" className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={limit} onChange={(event) => setLimit(event.target.value)} /></label>
              {save.isError && <ErrorState message="Settings could not be saved." />}
              <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</Button>
              {save.isSuccess && <span className="ml-3 text-sm text-emerald-600">Saved.</span>}
            </form>
          </Card>
          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">Connect your inboxes</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Open the official web apps, then export or copy messages into Sloth Stack for private local analysis. OAuth credentials are not stored by this demo.</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm font-medium">
                <a href="/sloth-stack-inbox-sample.txt" download className="text-primary hover:underline">Download sample inbox</a>
                <a href="/sloth-stack-task-extraction-test.txt" download className="text-primary hover:underline">Download task test</a>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'Gmail', icon: Mail, url: 'https://mail.google.com', description: 'Open Gmail inbox' },
                { name: 'WhatsApp', icon: MessageCircle, url: 'https://web.whatsapp.com', description: 'Open WhatsApp Web' },
                { name: 'Slack', icon: Users, url: 'https://app.slack.com/client', description: 'Open Slack workspace' },
              ].map(({ name, icon: Icon, url, description }) => (
                <button key={name} type="button" onClick={() => openIntegration(name, url)} className="flex items-center justify-between rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted">
                  <span className="flex items-center gap-3"><Icon size={19} className="text-primary" /><span><span className="block font-medium">{name}</span><span className="text-xs text-muted-foreground">{openedIntegration === name ? 'Link opened' : description}</span></span></span>
                  <ExternalLink size={15} className="text-muted-foreground" />
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">To test the analyzer: download either sample, upload it from Files, and select Analyze. The task test document uses explicit checklist items for a deterministic extraction check.</p>
          </Card>
        </div>
      )}
    </>
  )
}
