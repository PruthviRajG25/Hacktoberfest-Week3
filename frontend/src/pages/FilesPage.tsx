import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, FileText, Trash2, Upload } from 'lucide-react'
import { deleteFile, generateBriefing, getAnalysis, listFiles, startAnalysis, uploadFile } from '@/lib/api-client'
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, toast } from '@/lib/ui'
import { formatBytes, formatDateTime, statusColor } from '@/lib/utils'
import type { FileRecord } from '@/lib/types'

/** Track per-file analysis job IDs so we can poll each independently. */
function useFileAnalysis() {
  const queryClient = useQueryClient()
  const [jobs, setJobs] = useState<Record<string, string>>({}) // fileId -> jobId

  const analyze = useMutation({
    mutationFn: (fileId: string) => startAnalysis(fileId),
    onSuccess: (job) => {
      setJobs((prev) => ({ ...prev, [job.file_id]: job.id }))
      toast('Analysis started — results will appear automatically.')
    },
    onError: () => toast('Analysis could not be started. Check Ollama status in Settings.', 'error'),
  })
  const report = useMutation({
    mutationFn: generateBriefing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing'] }),
  })

  // Poll each active job
  const activeJobs = Object.values(jobs)
  useQuery({
    queryKey: ['job-poll', activeJobs.join(',')],
    queryFn: async () => {
      const results = await Promise.all(activeJobs.map((id) => getAnalysis(id)))
      const done = results.filter((r) => ['completed', 'failed', 'cancelled'].includes(r.status))
      if (done.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['files'] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['action-plans'] })
        queryClient.invalidateQueries({ queryKey: ['activity'] })
        // Remove completed jobs from tracking
        const doneIds = new Set(done.map((j) => j.id))
        setJobs((prev) => {
          const next = { ...prev }
          for (const [fid, jid] of Object.entries(next)) {
            if (doneIds.has(jid)) delete next[fid]
          }
          return next
        })
        for (const j of done) {
          if (j.status === 'completed') {
            report.mutate()
            toast('Analysis complete — tasks and report updated.')
          }
          else toast(`Analysis failed: ${j.error_message ?? 'Check Ollama status.'}`, 'error')
        }
      }
      return results
    },
    enabled: activeJobs.length > 0,
    refetchInterval: 2000,
    retry: false,
  })

  return { analyze, analyzingFileIds: new Set(Object.keys(jobs)) }
}

function fileStatusBadge(status: string): 'success' | 'danger' | 'default' {
  if (status === 'parsed') return 'success'
  if (status === 'parse_failed') return 'danger'
  return 'default'
}

function FileRow({ file, onDelete, onAnalyze, isAnalyzing }: {
  file: FileRecord
  onDelete: () => void
  onAnalyze: () => void
  isAnalyzing: boolean
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{file.original_name}</p>
          <Badge variant={fileStatusBadge(file.status)}>{file.status}</Badge>
          {file.suggested_category && (
            <Badge variant="info">{file.suggested_category}</Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {file.format.toUpperCase()} · {formatBytes(file.size_bytes)} · Uploaded {formatDateTime(file.created_at)}
        </p>
        {file.parse_error && (
          <p className="mt-1 text-xs text-destructive">{file.parse_error}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="secondary"
          onClick={onAnalyze}
          disabled={isAnalyzing || file.status === 'parse_failed'}
          title={file.status === 'parse_failed' ? 'File failed to parse' : 'Analyze with local AI'}
        >
          <Brain size={15} className="mr-1 inline" />
          {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </Button>
        <Button variant="danger" onClick={onDelete} title="Delete file">
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  )
}

export function FilesPage() {
  const input = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { analyze, analyzingFileIds } = useFileAnalysis()

  const files = useQuery({
    queryKey: ['files'],
    queryFn: () => listFiles({ limit: 100 }),
    refetchInterval: 10000,
  })

  const upload = useMutation({
    mutationFn: uploadFile,
    onSuccess: async (file) => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      await analyze.mutateAsync(file.id)
      toast(`"${file.original_name}" uploaded and queued for task extraction.`)
    },
    onError: () => toast('Upload failed. Check the file type and size.', 'error'),
  })

  const remove = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast('File deleted.')
    },
    onError: () => toast('Could not delete file.', 'error'),
  })

  return (
    <>
      <PageHeader
        title="Files"
        description="Upload documents for private, local AI analysis. Supported: .txt, .md, .pdf, .json, .csv"
        action={
          <>
            <input
              ref={input}
              className="hidden"
              type="file"
              accept=".txt,.md,.pdf,.json,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload.mutate(file)
                e.target.value = ''
              }}
            />
            <Button onClick={() => input.current?.click()} disabled={upload.isPending}>
              <Upload size={16} className="mr-2 inline" />
              {upload.isPending ? 'Uploading…' : 'Upload file'}
            </Button>
          </>
        }
      />

      {upload.error && <ErrorState message="Upload failed. Ensure the file is a supported format (.txt, .md, .pdf, .json, .csv) and under the size limit." />}
      {analyze.error && <ErrorState message="Analysis could not be started. Check that Ollama is running and a model is configured in Settings." />}

      {files.isLoading ? (
        <Loading />
      ) : files.error ? (
        <ErrorState message="Files could not be loaded. Make sure the backend is running on port 8000." />
      ) : (
        <Card>
          <div className="divide-y">
            {files.data?.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onDelete={() => remove.mutate(file.id)}
                onAnalyze={() => analyze.mutate(file.id)}
                isAnalyzing={analyzingFileIds.has(file.id)}
              />
            ))}
          </div>
          {!files.data?.files.length && (
            <EmptyState
              icon={<FileText size={40} />}
              title="No files yet"
              description="Upload your first document to start extracting tasks and creating action plans."
              action={
                <Button onClick={() => input.current?.click()} disabled={upload.isPending}>
                  <Upload size={15} className="mr-2 inline" />Upload file
                </Button>
              }
            />
          )}
          {(files.data?.total ?? 0) > 0 && (
            <p className="mt-4 border-t pt-3 text-right text-xs text-muted-foreground">
              {files.data?.total} file{files.data?.total !== 1 ? 's' : ''} total
            </p>
          )}
        </Card>
      )}
    </>
  )
}
