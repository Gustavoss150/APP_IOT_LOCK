const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `A API respondeu com status ${response.status}`)
  }

  return payload as T
}

export async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`)
  return handleResponse<T>(response)
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function put<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function del(path: string): Promise<void> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'DELETE',
  })
  await handleResponse<unknown>(response)
}
