import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Upload } from 'lucide-react'
import { deleteFile, listFiles, uploadFile } from '@/lib/api-client'
import { Button, Card, ErrorState, Loading, PageHeader } from '@/lib/ui'

export function FilesPage() {
  const input = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const files = useQuery({ queryKey: ['files'], queryFn: () => listFiles({ limit: 100 }) })
  const upload = useMutation({ mutationFn: uploadFile, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] }) })
  const remove = useMutation({ mutationFn: deleteFile, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] }) })
  return (
    <>
      <PageHeader title="Files" description="Upload documents for private, local analysis." action={<><input ref={input} className="hidden" type="file" accept=".txt,.md,.pdf,.json,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = '' }} /><Button onClick={() => input.current?.click()} disabled={upload.isPending}><Upload size={16} className="mr-2 inline" />{upload.isPending ? 'Uploading…' : 'Upload file'}</Button></>} />
      {upload.error && <ErrorState message="Upload failed. Check the file type and size, then try again." />}
      {files.isLoading ? <Loading /> : files.error ? <ErrorState message="Files could not be loaded." /> : <Card><div className="divide-y">{files.data?.files.map((file) => <div key={file.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{file.original_name}</p><p className="mt-1 text-xs text-muted-foreground">{file.format.toUpperCase()} · {(file.size_bytes / 1024).toFixed(1)} KB · {file.status}</p>{file.parse_error && <p className="mt-1 text-xs text-destructive">{file.parse_error}</p>}</div><Button variant="danger" onClick={() => remove.mutate(file.id)} disabled={remove.isPending}><Trash2 size={15} /></Button></div>)}{!files.data?.files.length && <p className="py-6 text-center text-sm text-muted-foreground">No files yet. Upload your first document.</p>}</div></Card>}
    </>
  )
}
