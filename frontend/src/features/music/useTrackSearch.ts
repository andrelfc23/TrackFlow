import { useEffect, useRef, useState } from 'react'
import { LOGOUT_EVENT } from '../auth/sessionEvents'
import { musicApi } from './musicApi'
import type { Track } from './types'

export function useTrackSearch() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [next, setNext] = useState<number | null>(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const loading = useRef(false)
  useEffect(() => {
    const activeGeneration = generation
    const reset = () => {
      activeGeneration.current++
      loading.current = false
      setTracks([]); setNext(0); setBusy(false); setError('')
    }
    window.addEventListener(LOGOUT_EVENT, reset)
    return () => { window.removeEventListener(LOGOUT_EVENT, reset); activeGeneration.current++ }
  }, [])
  async function search() {
    if (next === null || loading.current) return
    const version = generation.current
    loading.current = true; setBusy(true); setError('')
    try {
      const page: { items: Track[]; nextOffset: number | null } = await musicApi.search(next)
      if (version !== generation.current) return
      setTracks(old => [...old, ...page.items.filter(t => !old.some(o => o.id === t.id))]); setNext(page.nextOffset)
    } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : 'Kunde inte hämta låtar.') }
    finally { if (version === generation.current) { setBusy(false); loading.current = false } }
  }
  return { tracks, next, busy, error, search }
}
