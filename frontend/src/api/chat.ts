/**
 * Chat API — streaming chat, TTS, voice transcription.
 */

import { apiPost, apiStream } from './client'

export interface ChatRequest {
  session_id: string
  message: string
  feature_type?: string
  temperature?: number
  top_p?: number
  max_tokens?: number
  system_prompt?: string
  mode?: string
  effort?: string
  internet?: boolean
  tools?: string[]
  attachments?: Array<{
    id: string
    name: string
    type: 'image' | 'video' | 'audio' | 'doc'
    size: string
    base64?: string
  }>
}

export interface ChatMetadata {
  model_id: string
  device: string
}

/**
 * Stream chat tokens via SSE. Yields raw token strings.
 * The first line may be `__METADATA__:{"model_id":...,"device":...}`.
 */
export async function* streamChat(req: ChatRequest): AsyncGenerator<string, void, unknown> {
  yield* apiStream('/api/chat/stream', req)
}

/**
 * Transcribe an audio file (upload).
 */
export async function transcribeAudio(file: File): Promise<{ text: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`/api/voice/transcribe`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Transcription failed: ${res.status}`)
  return res.json()
}

/**
 * Get TTS audio URL for text.
 */
export function getTtsUrl(text: string, speaker = 'Chelsie'): string {
  const params = new URLSearchParams({ text, speaker })
  return `/api/chat/tts?${params.toString()}`
}
