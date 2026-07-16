/**
 * Settings API — app settings, HuggingFace token management.
 */

import { apiGet, apiPost, apiDelete } from './client'

export interface AppSettings {
  model_directory: string
  data_directory: string
  default_hardware_mode: string
  enterprise_mode: boolean
  privacy_mode: boolean
  logging_level: string
  developer_mode: boolean
}

export interface HfTokenStatus {
  configured: boolean
  masked: string | null
  prefix: string | null
  length?: number
}

export function getSettings(): Promise<AppSettings> {
  return apiGet<AppSettings>('/api/settings')
}

export function updateSettings(settings: Partial<AppSettings>): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/api/settings', settings)
}

export function getHfTokenStatus(): Promise<HfTokenStatus> {
  return apiGet<HfTokenStatus>('/api/settings/hf-token')
}

export function saveHfToken(token: string): Promise<{ status: string; masked: string }> {
  return apiPost<{ status: string; masked: string }>('/api/settings/hf-token', { token })
}

export function revokeHfToken(): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/api/settings/hf-token/revoke')
}

export function deleteHfToken(): Promise<{ status: string }> {
  return apiDelete<{ status: string }>('/api/settings/hf-token')
}
