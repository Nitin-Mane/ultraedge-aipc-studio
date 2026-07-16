/**
 * Models API — catalog, prepare, benchmark, status, recommendations.
 */

import { apiGet, apiPost } from './client'

export interface ModelCatalogEntry {
  id: string
  name: string
  family: string
  feature_type: string
  parameter_size: string
  license: string
  source_url: string
  status: string
  state?: string
  recommended_device: string
  ram_required_gb: number
  precision_options: string
  npu_status: string
  created_at: string
  updated_at: string
  [key: string]: any  // allow additional properties from backend
}

export interface ModelJob {
  job_id: string | null
  model_id?: string
  status: string
  progress?: number
  message?: string
  log_path?: string
  started_at?: string
  finished_at?: string
}

export interface BenchmarkResult {
  id: string
  model_id: string
  model_name: string
  device: string
  precision: string
  first_token_latency_ms: number
  tokens_per_second: number
  model_load_time_ms: number
  ram_used_mb: number
  gpu_used_mb: number
  npu_status: string
  created_at: string
}

export function getModelsCatalog(): Promise<{ models: ModelCatalogEntry[] }> {
  return apiGet<{ models: ModelCatalogEntry[] }>('/api/models/catalog')
}

export function updateModelStatus(modelId: string, status: string): Promise<{ status: string }> {
  return apiPost<{ status: string }>(`/api/models/${modelId}/status`, { status })
}

export function recommendModels(featureType: string, profile = 'balanced'): Promise<any> {
  return apiPost<any>('/api/models/recommend', { feature_type: featureType, profile })
}

export function prepareModel(modelId: string, precision = 'INT4', step = 'all'): Promise<{ job_id: string; status: string }> {
  return apiPost<{ job_id: string; status: string }>(`/api/models/${modelId}/prepare`, { precision, step })
}

export function getModelJob(modelId: string): Promise<ModelJob> {
  return apiGet<ModelJob>(`/api/models/${modelId}/job`)
}

export function cancelJob(jobId: string): Promise<any> {
  return apiPost<any>(`/api/jobs/${jobId}/cancel`)
}

export function stopModel(modelId: string): Promise<any> {
  return apiPost<any>(`/api/models/${modelId}/stop`)
}

export function benchmarkModel(modelId: string, device = 'GPU', precision = 'INT4'): Promise<any> {
  return apiPost<any>(`/api/models/${modelId}/benchmark`, { device, precision })
}

export function runBenchmark(modelId: string, device = 'CPU'): Promise<any> {
  return apiPost<any>('/api/benchmarks/run', { model_id: modelId, device })
}

export function getBenchmarkResults(): Promise<{ results: BenchmarkResult[] }> {
  return apiGet<{ results: BenchmarkResult[] }>('/api/benchmarks/results')
}
