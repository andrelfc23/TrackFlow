import { useEffect, useRef, useState } from 'react'
import { LOGOUT_EVENT } from '../auth/sessionEvents'
import { musicApi } from './musicApi'
import { loadSdk } from './spotifySdk'
import type { Player, State, Track } from './types'

export function useSpotifyPlayer() {
  const [error, setError] = useState('')
  const [device, setDevice] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [state, setState] = useState<State | null>(null)
  const [volume, setVolume] = useState(50)
  const player = useRef<Player | null>(null)
  const generation = useRef(0)
  useEffect(() => {
    const activePlayer = player
    const activeGeneration = generation
    const reset = () => {
      activeGeneration.current++
      activePlayer.current?.disconnect(); activePlayer.current = null
      setState(null); setDevice(''); setConnecting(false); setError('')
    }
    window.addEventListener(LOGOUT_EVENT, reset)
    return () => {
      window.removeEventListener(LOGOUT_EVENT, reset)
      activeGeneration.current++; activePlayer.current?.disconnect()
    }
  }, [])
  useEffect(() => {
    if (!device) return
    let active = true
    const timer = window.setInterval(() => {
      player.current?.getCurrentState().then(s => { if (active) setState(s) }).catch(() => {})
    }, 1000)
    return () => { active = false; clearInterval(timer) }
  }, [device])
  async function connect() {
    if (connecting || player.current) return
    const version = generation.current
    setConnecting(true); setError('')
    try {
      await loadSdk()
      if (version !== generation.current) return
      const p = new window.Spotify!.Player({ name: 'TrackFlow', volume: 0.5,
        getOAuthToken: callback => { musicApi.token().then(data => { if (version === generation.current) callback(data.accessToken) }).catch(e => {
          if (version === generation.current) { p.disconnect(); player.current = null; setDevice(''); setConnecting(false); setError(e.message) }
        }) } })
      player.current = p
      p.addListener('ready', ({ device_id }) => { if (version === generation.current) { setDevice(device_id); setConnecting(false) } })
      p.addListener('not_ready', () => { if (version === generation.current) { setDevice(''); p.disconnect(); player.current = null; setConnecting(false); setError('Spelaren kopplades från. Anslut igen.') } })
      p.addListener('player_state_changed', s => { if (version === generation.current) setState(s) })
      for (const event of ['initialization_error', 'authentication_error', 'account_error', 'playback_error', 'autoplay_failed'] as const) {
        p.addListener(event, () => { if (version === generation.current) {
          setError(event === 'account_error' ? 'Uppspelning kräver Spotify Premium.' : 'Spotify kunde inte spela. Prova igen eller logga ut och in för nya behörigheter.')
          if (event !== 'playback_error' && event !== 'autoplay_failed') { p.disconnect(); player.current = null; setDevice(''); setConnecting(false) }
        } })
      }
      const ready = new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Spelaren svarade inte. Kontrollera Premium och försök igen.')), 20000)
        p.addListener('ready', () => { clearTimeout(timer); resolve() })
      })
      const connected = p.connect().then(ok => { if (!ok) throw new Error('Kunde inte ansluta Spotify-spelaren.') })
      await Promise.all([ready, connected])
    } catch (e) { if (version === generation.current) { player.current?.disconnect(); player.current = null; setConnecting(false); setError(e instanceof Error ? e.message : 'Spelaren kunde inte anslutas.') } }
  }
  async function play(track: Track) {
    setError('')
    try {
      await player.current?.activateElement()
      await musicApi.play(device, track.uri)
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte spela låten.') }
  }
  async function control(action: () => Promise<void> | undefined) {
    try { await action() } catch { setError('Kunde inte ändra uppspelningen. Försök igen.') }
  }
  return {
    error, device, connecting, state, volume, connect, play,
    toggle: () => control(() => player.current?.togglePlay()),
    seek: (position: number) => control(() => player.current?.seek(position)),
    changeVolume: (value: number) => {
      setVolume(value)
      return control(() => player.current?.setVolume(value / 100))
    },
  }
}
