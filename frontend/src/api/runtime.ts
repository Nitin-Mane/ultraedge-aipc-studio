/**
 * Runtime API — model load/unload/status/logs.
 */

import { apiGet, apiPost } from './client'

export interface ActiveModelInfo {
  model_id: string | null
  device: string | null
  precision: string | null
  pipeline_type: string | null
  loading: boolean
}

export interface LoadModelResponse {
  status: string
  model_id: string
  device: string
}

export interface UnloadModelResponse {
  status: string
  unloaded_model?: string
}

export function loadModel(modelId: string, device = 'CPU', precision = 'INT4'): Promise<LoadModelResponse> {
  return apiPost<LoadModelResponse>('/api/runtime/load', { model_id: modelId, device, precision })
}

export function unloadModel(): Promise<UnloadModelResponse> {
  return apiPost<UnloadModelResponse>('/api/runtime/unload')
}

export function getActiveModel(): Promise<ActiveModelInfo> {
  return apiGet<ActiveModelInfo>('/api/runtime/active')
}

export function getRuntimeLogs(): Promise<{ logs: string[] }> {
  return apiGet<{ logs: string[] }>('/api/runtime/logs')
}
