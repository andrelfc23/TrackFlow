import { useEffect, useState } from 'react'
import { notifyLogout } from './sessionEvents'

type Status = { configured: boolean; authenticated: boolean; displayName: string | null; csrfToken: string }
const messages: Record<string, string> = {
  failed: 'Spotify-inloggningen avbröts eller misslyckades. Försök igen och kontrollera appens inställningar.',
  'not-configured': 'Spotify-appen behöver konfigureras först. Följ SPOTIFY_SETUP.md i projektmappen.',
  connected: 'Du är inloggad med Spotify. Du kan nu hämta låtar och ansluta spelaren.',
}

export function useSpotifyAccount() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [notice] = useState(() => messages[new URLSearchParams(window.location.search).get('spotify') ?? ''] ?? '')
  const wrongHost = window.location.hostname !== '127.0.0.1'

  useEffect(() => {
    if (wrongHost) return
    const controller = new AbortController()
    fetch('/api/auth/status', { signal: controller.signal, credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error('Backend svarar inte. Starta TrackFlow.Api och försök igen.')
        const data: Status = await response.json()
        if (typeof data.authenticated !== 'boolean') throw new Error('Oväntat svar från backend.')
        setStatus(data)
        setError('')
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Kunde inte nå backend.') })
    const url = new URL(window.location.href)
    if (url.searchParams.has('spotify')) {
      url.searchParams.delete('spotify')
      window.history.replaceState(null, '', url)
    }
    return () => controller.abort()
  }, [attempt, wrongHost])

  async function logout() {
    if (!status) return
    setBusy(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': status.csrfToken } })
      if (!response.ok && response.status !== 401) throw new Error('Utloggningen misslyckades. Försök igen.')
      notifyLogout()
      setStatus(null)
      setAttempt(n => n + 1)
    } catch (err) { setError(err instanceof Error ? err.message : 'Kunde inte logga ut.') }
    finally { setBusy(false) }
  }

  return { status, error, busy, notice, wrongHost, logout, retry: () => setAttempt(n => n + 1) }
}
