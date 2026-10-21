/**
 * TypeScript types matching the backend API schemas.
 */

export interface HealthResponse {
  status: string
  timestamp: string
  version: string
}

export interface AIStatusResponse {
  ollama_available: boolean
  ollama_url: string
  configured_model: string
  model_available: boolean
  error: string | null
}

export interface ModelInfo {
  name: string
  size: number | null
  modified_at: string | null
}

export interface ModelsResponse {
  models: ModelInfo[]
}

export interface FileRecord {
  id: string
  original_name: string
  format: string
  size_bytes: number
  status: 'pending' | 'parsed' | 'parse_failed'
  suggested_category: string | null
  category_confidence: number | null
  parse_error: string | null
  created_at: string
  updated_at: string
}

export interface FileListResponse {
  files: FileRecord[]
  total: number
}

export interface AnalysisJob {
  id: string
  file_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  retry_count: number
  error_message: string | null
  result_summary: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ExtractedTask {
  id: string
  file_id: string
  analysis_id: string
  description: string
  deadline: string | null
  deadline_raw: string | null
  priority: 'high' | 'medium' | 'low'
  confidence: number
  status: 'active' | 'dismissed' | 'completed'
  created_at: string
  updated_at: string
}

export interface TaskListResponse {
  tasks: ExtractedTask[]
  total: number
}

export interface ProposedAction {
  id: string
  plan_id: string
  file_id: string
  action_type: string
  description: string
  rationale: string
  parameters: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'succeeded' | 'failed'
  idempotency_key: string
  error_message: string | null
  created_at: string
  executed_at: string | null
}

export interface ActionPlan {
  id: string
  analysis_id: string
  status: string
  created_at: string
  actions: ProposedAction[]
}

export interface ActionPlanListResponse {
  plans: ActionPlan[]
  total: number
}

export interface AuditEvent {
  id: string
  event_type: string
  description: string
  actor: string
  related_file_id: string | null
  related_action_id: string | null
  related_analysis_id: string | null
  created_at: string
}

export interface ActivityResponse {
  events: AuditEvent[]
  total: number
}

export interface AppSettings {
  ollama_base_url: string
  ollama_model: string
  ollama_timeout: number
  max_upload_size_mb: number
  max_extracted_text_chars: number
  log_level: string
  demo_mode: boolean
  app_data_dir: string
}

export interface DailyBriefing {
  id: string
  content: string
  status: 'generating' | 'ready' | 'failed'
  error_message: string | null
  generated_at: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    detail: string | null
    request_id: string | null
  }
}
