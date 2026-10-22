import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Circle, Edit3, ImagePlus, ListChecks, Plus, Save, Trash2, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listTasks, updateTask } from '@/lib/api-client'
import type { ExtractedTask } from '@/lib/types'
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, toast } from '@/lib/ui'
import { formatDate, statusColor } from '@/lib/utils'

interface CustomTodo {
  id: string
  description: string
  deadline: string
  imageData: string | null
  completed: boolean
  createdAt: string
}

const CUSTOM_TODOS_KEY = 'sloth-stack-custom-todos'

const priorityBadge: Record<string, 'danger' | 'warning' | 'info'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

export function TasksPage() {
  const input = useRef<HTMLInputElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // ── Extracted tasks from AI ─────────────────────────────────────────────────
  const tasks = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks({ limit: 100 }),
    refetchInterval: 8000,
    retry: 2,
  })
  const update = useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<Pick<ExtractedTask, 'status' | 'description' | 'deadline' | 'priority'>>) =>
      updateTask(id, updates),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      if (vars.status === 'completed') toast('Task marked as complete.')
      else toast('Task updated.')
    },
    onError: () => toast('Could not update task. Check the backend is running.', 'error'),
  })

  // ── Custom todos (localStorage) ─────────────────────────────────────────────
  const [customTodos, setCustomTodos] = useState<CustomTodo[]>([])
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)

  // ── Inline edit state ───────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editPriority, setEditPriority] = useState<ExtractedTask['priority']>('medium')
  const [editTodoDescription, setEditTodoDescription] = useState('')
  const [editTodoDeadline, setEditTodoDeadline] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem(CUSTOM_TODOS_KEY)
    if (saved) {
      try { setCustomTodos(JSON.parse(saved) as CustomTodo[]) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_TODOS_KEY, JSON.stringify(customTodos))
  }, [customTodos])

  const extractedTasks = useMemo(() => tasks.data?.tasks ?? [], [tasks.data])
  const activeTasks = useMemo(() => extractedTasks.filter((t) => t.status === 'active'), [extractedTasks])
  const completedTasks = useMemo(() => extractedTasks.filter((t) => t.status === 'completed'), [extractedTasks])
  const pendingTodos = useMemo(() => customTodos.filter((t) => !t.completed), [customTodos])
  const completedTodos = useMemo(() => customTodos.filter((t) => t.completed), [customTodos])

  function startEditing(task: ExtractedTask) {
    setEditingId(task.id)
    setEditDescription(task.description)
    setEditDeadline(task.deadline ?? '')
    setEditPriority(task.priority)
  }

  function saveEdit() {
    if (!editingId || !editDescription.trim()) return
    update.mutate(
      { id: editingId, description: editDescription.trim(), deadline: editDeadline || null, priority: editPriority },
      { onSuccess: () => setEditingId(null) },
    )
  }

  function addTodo() {
    const trimmed = description.trim()
    if (!trimmed) return
    setCustomTodos((todos) => [
      ...todos,
      { id: crypto.randomUUID(), description: trimmed, deadline, imageData, completed: false, createdAt: new Date().toISOString() },
    ])
    setDescription('')
    setDeadline('')
    setImageData(null)
    toast('Todo added.')
    input.current?.focus()
  }

  function toggleTodo(id: string) {
    setCustomTodos((items) => items.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  function deleteTodo(id: string) {
    setCustomTodos((items) => items.filter((item) => item.id !== id))
    toast('Todo removed.')
  }

  function startEditingTodo(todo: CustomTodo) {
    setEditingTodoId(todo.id)
    setEditTodoDescription(todo.description)
    setEditTodoDeadline(todo.deadline)
  }

  function saveTodoEdit() {
    const trimmed = editTodoDescription.trim()
    if (!editingTodoId || !trimmed) return
    setCustomTodos((items) => items.map((item) => item.id === editingTodoId
      ? { ...item, description: trimmed, deadline: editTodoDeadline }
      : item))
    setEditingTodoId(null)
    toast('Todo updated.')
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description="AI-extracted action items and your own deadline-aware todos."
        action={<Button onClick={() => input.current?.focus()}><Plus size={15} className="mr-1 inline" />New todo</Button>}
      />

      {/* ── Custom todo creator ── */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">Create a custom todo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add your own task, deadline, and optional image reference.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input
            ref={input}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="What needs to be done?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
            aria-label="New todo description"
          />
          <input
            type="date"
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Todo deadline"
          />
          <div className="flex gap-2">
            <input
              ref={imageInput}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => setImageData(String(reader.result))
                reader.readAsDataURL(file)
                e.target.value = ''
              }}
            />
            <Button variant="secondary" onClick={() => imageInput.current?.click()} title={imageData ? 'Image attached' : 'Attach image'}>
              <ImagePlus size={15} className="mr-1 inline" />
              {imageData ? 'Image ✓' : 'Image'}
            </Button>
            <Button onClick={addTodo} disabled={!description.trim()}>
              Add
            </Button>
          </div>
        </div>
        {imageData && (
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <img src={imageData} alt="Todo reference preview" className="h-14 w-14 rounded-lg object-cover" />
            <button type="button" className="text-destructive hover:underline" onClick={() => setImageData(null)}>
              Remove image
            </button>
          </div>
        )}
      </Card>

      {/* ── Imported tasks from AI ── */}
      <Card className="mb-6">
        <h2 className="mb-1 font-semibold">Imported from mail and documents</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {extractedTasks.length > 0
            ? `${activeTasks.length} active · ${completedTasks.length} completed`
            : 'Extracted automatically when you analyze a file with Ollama.'}
        </p>

        {tasks.isLoading && <Loading label="Loading tasks…" />}
        {tasks.error && (
          <ErrorState message="Tasks could not be loaded. Make sure the backend is running on port 8000." />
        )}

        {!tasks.isLoading && !tasks.error && !extractedTasks.length && (
          <>
            <EmptyState
              icon={<ListChecks size={40} />}
              title="No extracted tasks yet"
              description="Upload the demo briefing from the Files page and click Analyze to extract tasks with your local AI model."
            />
            <div className="mt-5 rounded-xl border border-dashed bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo task preview</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  ['Review the onboarding flow', 'Due tomorrow'],
                  ['Download the quarterly invoice', 'Due Friday'],
                  ['Add priorities to the sprint document', 'Due Monday'],
                ].map(([description, deadline]) => (
                  <div key={description} className="rounded-lg border bg-background p-3 text-sm">
                    <p className="font-medium">{description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{deadline} · medium priority</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!tasks.isLoading && !tasks.error && extractedTasks.length > 0 && (
          <div className="divide-y">
            {extractedTasks.map((task) =>
              editingId === task.id ? (
                /* Edit mode */
                <div key={task.id} className="space-y-3 py-4">
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    aria-label="Edit task description"
                    autoFocus
                  />
                  <div className="grid gap-2 sm:grid-cols-[180px_160px_1fr]">
                    <input
                      type="date"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      aria-label="Edit task deadline"
                    />
                    <select
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as ExtractedTask['priority'])}
                      aria-label="Edit task priority"
                    >
                      <option value="high">High priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="low">Low priority</option>
                    </select>
                    <div className="flex gap-2 sm:justify-end">
                      <Button onClick={saveEdit} disabled={update.isPending || !editDescription.trim()}>
                        <Save size={15} className="mr-1 inline" />
                        {update.isPending ? 'Saving…' : 'Save'}
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        <X size={15} className="mr-1 inline" />Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div key={task.id} className="flex flex-col gap-3 py-4 first:pt-2 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    className={`mt-0.5 shrink-0 ${task.status === 'completed' ? 'text-emerald-500' : 'text-primary'}`}
                    aria-label={task.status === 'completed' ? 'Task completed' : 'Mark as complete'}
                    onClick={() => task.status === 'active' && update.mutate({ id: task.id, status: 'completed' })}
                  >
                    {task.status === 'completed' ? <Check size={18} /> : <Circle size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={task.status === 'completed' ? 'font-medium text-muted-foreground line-through' : 'font-medium'}>
                      {task.description}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={priorityBadge[task.priority] ?? 'default'}>{task.priority}</Badge>
                      <span className={`text-xs ${statusColor(task.status)} rounded-full px-2 py-0.5`}>{task.status}</span>
                      {task.deadline && (
                        <span className="text-xs text-muted-foreground">Due {formatDate(task.deadline)}</span>
                      )}
                      {!task.deadline && task.deadline_raw && (
                        <span className="text-xs text-muted-foreground">"{task.deadline_raw}"</span>
                      )}
                      <span className="text-xs text-muted-foreground">{Math.round(task.confidence * 100)}% confidence</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" onClick={() => startEditing(task)}>
                      <Edit3 size={15} className="mr-1 inline" />Edit
                    </Button>
                    {task.status === 'active' && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => update.mutate({ id: task.id, status: 'completed' })}
                          disabled={update.isPending}
                        >
                          <Check size={15} className="mr-1 inline" />Done
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => update.mutate({ id: task.id, status: 'dismissed' })}
                          disabled={update.isPending}
                          title="Remove extracted task"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>

      {/* ── Custom todos ── */}
      <Card>
        <h2 className="mb-1 font-semibold">My custom todos</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {customTodos.length > 0
            ? `${pendingTodos.length} pending · ${completedTodos.length} completed · Saved in this browser`
            : 'Saved locally in this browser — no account needed.'}
        </p>

        {!customTodos.length && (
          <EmptyState
            icon={<Plus size={40} />}
            title="No custom todos yet"
            description="Use the form above to add your first todo with an optional deadline and image."
          />
        )}

        {customTodos.length > 0 && (
          <div className="divide-y">
            {customTodos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 py-4 first:pt-2">
                <button
                  type="button"
                  className={todo.completed ? 'shrink-0 text-emerald-500' : 'shrink-0 text-primary'}
                  aria-label={todo.completed ? 'Mark todo active' : 'Complete todo'}
                  onClick={() => toggleTodo(todo.id)}
                >
                  {todo.completed ? <Check size={18} /> : <Circle size={18} />}
                </button>
                {todo.imageData && (
                  <img src={todo.imageData} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                )}
                {editingTodoId === todo.id ? (
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
                    <input className="rounded-lg border bg-background px-3 py-2 text-sm" value={editTodoDescription} onChange={(e) => setEditTodoDescription(e.target.value)} aria-label="Edit custom todo description" autoFocus />
                    <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" value={editTodoDeadline} onChange={(e) => setEditTodoDeadline(e.target.value)} aria-label="Edit custom todo deadline" />
                    <div className="flex gap-2">
                      <Button onClick={saveTodoEdit} disabled={!editTodoDescription.trim()}>Save</Button>
                      <Button variant="secondary" onClick={() => setEditingTodoId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className={todo.completed ? 'font-medium text-muted-foreground line-through' : 'font-medium'}>{todo.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{todo.deadline ? `Due ${formatDate(todo.deadline)}` : 'No deadline'} &middot; Custom todo</p>
                  </div>
                )}
                {editingTodoId !== todo.id && (
                  <button type="button" className="shrink-0 text-muted-foreground transition-colors hover:text-primary" aria-label="Edit custom todo" onClick={() => startEditingTodo(todo)}>
                    <Edit3 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Delete custom todo"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
