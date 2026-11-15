import { useState } from 'react'
import type { Track } from '../music/types'
export type Playlist = { id: string; name: string; tracks: Track[] }
export function usePlaylists(userId: string) {
  const key = `trackflow.playlists.v1.${userId}`
  const [error, setError] = useState('')
  const [lists, setLists] = useState<Playlist[]>(() => {
    if (!userId) return []
    try {
      const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      if (!Array.isArray(data)) return []
      return data.filter((p): p is Playlist => typeof p?.id === 'string' && typeof p?.name === 'string' && Array.isArray(p?.tracks)).map(p => ({ ...p, tracks: p.tracks.filter(t => typeof t?.id === 'string' && typeof t?.title === 'string' && typeof t?.artist === 'string' && typeof t?.url === 'string' && t.url.startsWith('https://open.spotify.com/') && typeof t?.milliseconds === 'number') }))
    } catch { return [] }
  })
  function save(next: Playlist[]) {
    if (!userId) { setError('Starta om backend och logga in igen för att spara spellistor för ditt konto.'); return false }
    try { localStorage.setItem(key, JSON.stringify(next)); setLists(next); setError(''); return true }
    catch { setError('Kunde inte spara i webbläsaren. Kontrollera lagringsutrymme och webbläsarinställningar.'); return false }
  }
  function create(name: string) {
    if (!name.trim()) return null
    const id = crypto.randomUUID()
    return save([...lists, { id, name: name.trim().slice(0, 80), tracks: [] }]) ? id : null
  }
  return {
    lists, error, create,
    add: (id: string, track: Track) => save(lists.map(p => p.id === id && !p.tracks.some(t => t.id === track.id) ? { ...p, tracks: [...p.tracks, track] } : p)),
    removeTrack: (id: string, trackId: string) => save(lists.map(p => p.id === id ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId) } : p)),
    remove: (id: string) => save(lists.filter(p => p.id !== id)),
    rename: (id: string, name: string) => !!name.trim() && save(lists.map(p => p.id === id ? { ...p, name: name.trim().slice(0, 80) } : p)),
  }
}
