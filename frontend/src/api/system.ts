/**
 * System API — health, hardware, audit logs, security reset, maintenance.
 */

import { apiGet, apiPost } from './client'

export interface HardwareProfile {
  cpu: string
  gpu: string
  npu: string | null
  ram_total_gb: number
  ram_available_gb: number
  storage_free_gb: number
  storage_total?: string
  supported_devices: string[]
  openvino_status: string
  driver_readiness: string
}

export interface AuditLog {
  id: string
  event_type: string
  actor: string
  details: string
  created_at: string
}

export interface HealthResponse {
  status: string
  version: string
  backend: string
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/api/health')
}

export function getSystemProfile(): Promise<HardwareProfile> {
  return apiGet<HardwareProfile>('/api/system/profile')
}

export function getAuditLogs(): Promise<{ logs: AuditLog[] }> {
  return apiGet<{ logs: AuditLog[] }>('/api/audit-logs')
}

export function resetSecurity(): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/api/security/reset')
}

export function triggerCleanup(): Promise<any> {
  return apiPost<any>('/api/maintenance/cleanup')
}

export function getMaintenanceStatus(): Promise<any> {
  return apiGet<any>('/api/maintenance/status')
}
