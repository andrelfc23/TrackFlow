// JSON requests used by music features. Mutations require the current CSRF token.
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    const status = await fetch('/api/auth/status')
    if (!status.ok) throw new Error('Backend svarar inte.')
    const session = await status.json()
    if (!session.authenticated) throw new Error('Logga in med Spotify först.')
    headers['X-CSRF-TOKEN'] = session.csrfToken
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.error ?? (response.status === 401
      ? 'Logga in med Spotify först.' : 'Anropet misslyckades. Försök igen.'))
  }
  return response.status === 204 ? undefined as T : response.json()
}
