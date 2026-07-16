import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost, apiPut, apiDelete, ApiError, BASE_URL } from '../api/client'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('api/client', () => {
  it('BASE_URL defaults to localhost:8000', () => {
    expect(BASE_URL).toBe('http://localhost:8000')
  })

  it('apiGet sends GET request and returns JSON', async () => {
    const mockData = { status: 'ok' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    }))

    const result = await apiGet('/api/health')
    expect(result).toEqual(mockData)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/health',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('apiPost sends POST with JSON body', async () => {
    const mockData = { id: '123' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    }))

    const result = await apiPost('/api/test', { name: 'test' })
    expect(result).toEqual(mockData)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      })
    )
  })

  it('apiPut sends PUT request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: true }),
    }))

    const result = await apiPut('/api/test/1', { name: 'updated' })
    expect(result).toEqual({ updated: true })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/test/1',
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('apiDelete sends DELETE request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ deleted: true }),
    }))

    const result = await apiDelete('/api/test/1')
    expect(result).toEqual({ deleted: true })
  })

  it('throws ApiError on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ detail: 'not found' }),
    }))

    await expect(apiGet('/api/missing')).rejects.toThrow(ApiError)
    try {
      await apiGet('/api/missing')
    } catch (e) {
      expect((e as ApiError).status).toBe(404)
    }
  })

  it('apiPost sends undefined body when no body provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    }))

    await apiPost('/api/test')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/test',
      expect.objectContaining({ body: undefined })
    )
  })
})
