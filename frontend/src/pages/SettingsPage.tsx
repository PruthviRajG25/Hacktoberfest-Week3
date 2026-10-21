import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings } from '@/lib/api-client'
import { Button, Card, ErrorState, Loading, PageHeader } from '@/lib/ui'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [model, setModel] = useState('')
  const [url, setUrl] = useState('')
  const [limit, setLimit] = useState('')
  useEffect(() => { if (settings.data) { setModel(settings.data.ollama_model); setUrl(settings.data.ollama_base_url); setLimit(String(settings.data.max_upload_size_mb)) } }, [settings.data])
  const save = useMutation({ mutationFn: () => updateSettings({ ollama_model: model, ollama_base_url: url, max_upload_size_mb: Number(limit) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }) })
  return <><PageHeader title="Settings" description="Configure local inference and safe upload limits." />{settings.isLoading ? <Loading /> : settings.error ? <ErrorState message="Settings could not be loaded." /> : <Card><form className="max-w-xl space-y-5" onSubmit={(event) => { event.preventDefault(); save.mutate() }}><label className="block text-sm font-medium">Ollama base URL<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={url} onChange={(event) => setUrl(event.target.value)} /></label><label className="block text-sm font-medium">Model name<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={model} onChange={(event) => setModel(event.target.value)} /></label><label className="block text-sm font-medium">Maximum upload size (MB)<input type="number" min="1" className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={limit} onChange={(event) => setLimit(event.target.value)} /></label>{save.isError && <ErrorState message="Settings could not be saved." />}<Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</Button>{save.isSuccess && <span className="ml-3 text-sm text-emerald-600">Saved.</span>}</form></Card>}</>
}
