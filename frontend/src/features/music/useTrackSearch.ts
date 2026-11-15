import { useEffect, useRef, useState } from 'react'
import { musicApi } from './musicApi'
import type { Track } from './types'

export type SearchFilters = { genres: string[]; ranges: { from: number; to: number }[] }
type Query = { genre: string; from: number; to: number; offset: number | null }
export function useTrackSearch() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const generation = useRef(0)
  const loading = useRef(false)
  const queries = useRef<Query[]>([])
  useEffect(() => { const version = generation; return () => { version.current++ } }, [])
  async function search(newFilters?: SearchFilters) {
    if (loading.current) return false
    if (newFilters) {
      queries.current = newFilters.genres.flatMap(genre => newFilters.ranges.map(range => ({ genre, ...range, offset: 0 })))
      setFilters(newFilters); setTracks([]); setSearched(false)
    }
    if (!queries.current.length) return false
    const version = ++generation.current
    loading.current = true; setBusy(true); setError('')
    try {
      const pages: Track[][] = []
      const nextQueries = queries.current.map(q => ({ ...q }))
      // Sequential requests avoid bursts when several decades and genres are combined.
      for (const q of nextQueries) {
        if (q.offset === null) continue
        const page = await musicApi.search(q.offset, q.genre, q.from, q.to)
        if (version !== generation.current) return false
        if (page.genre !== q.genre || page.yearFrom !== q.from || page.yearTo !== q.to)
          throw new Error('Backend använder en äldre sökning. Starta om TrackFlow.Api och försök igen.')
        q.offset = page.nextOffset; pages.push(page.items)
      }
      queries.current = nextQueries
      const mixed = Array.from({ length: 10 }, (_, i) => pages.flatMap(page => page[i] ? [page[i]] : [])).flat()
      setTracks(old => [...new Map([...old, ...mixed].map(track => [track.id, track])).values()])
      setHasMore(nextQueries.some(q => q.offset !== null)); setSearched(true)
      return true
    } catch (e) {
      if (version === generation.current) setError(e instanceof Error ? e.message : 'Kunde inte hämta låtar.')
      return false
    } finally { if (version === generation.current) { setBusy(false); loading.current = false } }
  }
  return { tracks, busy, searched, hasMore, error, filters, search }
}
