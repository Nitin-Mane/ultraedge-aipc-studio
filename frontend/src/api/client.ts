/**
 * Centralised API client for UltraEdge AIPC Studio.
 *
 * All page-level fetch() calls should migrate here over time.  The base URL
 * is read from `VITE_API_URL` (set in `.env.development` / `.env.production`).
 */

const BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000'

// ── Helpers ────────────────────────────────────────────────────────────────

class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new ApiError(res.status, `${res.status} ${res.statusText} — ${path}`, body)
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ── Typed convenience wrappers ──────────────────────────────────────────────

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

/**
 * SSE stream helper — returns an async iterator of parsed JSON lines.
 * Used for chat streaming endpoints.
 */
export async function* apiStream(
  path: string,
  body?: unknown,
): AsyncGenerator<string, void, unknown> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText} — ${path}`)
  }

  const reader = res.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) yield trimmed
    }
  }

  if (buffer.trim()) yield buffer.trim()
}

export { BASE_URL, ApiError }
