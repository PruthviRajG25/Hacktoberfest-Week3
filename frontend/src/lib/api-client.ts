/**
 * Typed API client for the Sloth Stack backend.
 * All functions throw ApiError on non-2xx responses.
 */

import type {
  ActionPlan,
  ActionPlanListResponse,
  ActivityResponse,
  AIStatusResponse,
  AnalysisJob,
  AppSettings,
  DailyBriefing,
  ExtractedTask,
  FileListResponse,
  FileRecord,
  HealthResponse,
  ModelsResponse,
  TaskListResponse,
} from '@/lib/types'

const BASE = '/api/v1'

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'NETWORK_ERROR', message: res.statusText } }))
    throw body
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealth = (): Promise<HealthResponse> =>
  request('/health')

// ── AI ───────────────────────────────────────────────────────────────────────

export const getAIStatus = (): Promise<AIStatusResponse> =>
  request('/ai/status')

export const getModels = (): Promise<ModelsResponse> =>
  request('/ai/models')

// ── Files ─────────────────────────────────────────────────────────────────────

export const listFiles = (params?: { skip?: number; limit?: number }): Promise<FileListResponse> => {
  const q = new URLSearchParams()
  if (params?.skip != null) q.set('skip', String(params.skip))
  if (params?.limit != null) q.set('limit', String(params.limit))
  return request(`/files?${q}`)
}

export const getFile = (id: string): Promise<FileRecord> =>
  request(`/files/${id}`)

export const uploadFile = (file: File): Promise<FileRecord> => {
  const form = new FormData()
  form.append('file', file)
  return request('/files/upload', {
    method: 'POST',
    headers: {},  // Let browser set multipart boundary
    body: form,
  })
}

export const deleteFile = (id: string): Promise<void> =>
  request(`/files/${id}`, { method: 'DELETE' })

// ── Analysis ──────────────────────────────────────────────────────────────────

export const startAnalysis = (file_id: string): Promise<AnalysisJob> =>
  request('/analysis', {
    method: 'POST',
    body: JSON.stringify({ file_id }),
  })

export const getAnalysis = (id: string): Promise<AnalysisJob> =>
  request(`/analysis/${id}`)

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const listTasks = (params?: { status?: string; skip?: number; limit?: number }): Promise<TaskListResponse> => {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.skip != null) q.set('skip', String(params.skip))
  if (params?.limit != null) q.set('limit', String(params.limit))
  return request(`/tasks?${q}`)
}

export const updateTask = (id: string, updates: Partial<Pick<ExtractedTask, 'description' | 'deadline' | 'priority' | 'status'>>): Promise<ExtractedTask> =>
  request(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

// ── Action Plans ──────────────────────────────────────────────────────────────

export const listActionPlans = (params?: { skip?: number; limit?: number }): Promise<ActionPlanListResponse> => {
  const q = new URLSearchParams()
  if (params?.skip != null) q.set('skip', String(params.skip))
  if (params?.limit != null) q.set('limit', String(params.limit))
  return request(`/action-plans?${q}`)
}

export const getActionPlan = (id: string): Promise<ActionPlan> =>
  request(`/action-plans/${id}`)

export const approveAction = (actionId: string): Promise<import('@/lib/types').ProposedAction> =>
  request(`/actions/${actionId}/approve`, { method: 'POST' })

export const rejectAction = (actionId: string): Promise<import('@/lib/types').ProposedAction> =>
  request(`/actions/${actionId}/reject`, { method: 'POST' })

// ── Activity ──────────────────────────────────────────────────────────────────

export const getActivity = (params?: { skip?: number; limit?: number }): Promise<ActivityResponse> => {
  const q = new URLSearchParams()
  if (params?.skip != null) q.set('skip', String(params.skip))
  if (params?.limit != null) q.set('limit', String(params.limit))
  return request(`/activity?${q}`)
}

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSettings = (): Promise<AppSettings> =>
  request('/settings')

export const updateSettings = (updates: Partial<Pick<AppSettings, 'ollama_model' | 'ollama_base_url' | 'max_upload_size_mb'>>): Promise<AppSettings> =>
  request('/settings', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

// ── Briefing ──────────────────────────────────────────────────────────────────

export const getBriefing = (): Promise<DailyBriefing | null> =>
  request('/briefing')

export const generateBriefing = (): Promise<{ briefing_id: string; status: string }> =>
  request('/briefing/generate', { method: 'POST' })
