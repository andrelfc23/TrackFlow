import type { State } from './types'
import { formatTime } from '../../utils/formatTime'

type Props = {
  state: State | null; connected: boolean; volume: number
  onToggle: () => void; onSeek: (position: number) => void; onVolumeChange: (volume: number) => void
}
export function PlayerBar({ state, connected, volume, onToggle, onSeek, onVolumeChange }: Props) {
  return (
    <footer className="player" aria-label="Spotify-spelare"><div className="now-playing"><div><strong>{state?.track_window.current_track.name ?? 'Välj en låt'}</strong><span>{state?.track_window.current_track.artists.map(a => a.name).join(', ') ?? 'Spotify'}</span></div></div>
      <div className="transport"><button className="round-play" disabled={!state} onClick={onToggle} aria-label={state?.paused ? 'Spela' : 'Pausa'}>{state?.paused ? '▶' : 'Ⅱ'}</button><div className="timeline"><span>{formatTime(state?.position ?? 0)}</span><input aria-label="Position i låten" type="range" min="0" max={state?.duration || 1} value={state?.position ?? 0} disabled={!state} onChange={e => onSeek(Number(e.target.value))} /><span>{formatTime(state?.duration ?? 0)}</span></div></div>
      <div className="volume"><label htmlFor="volume">Volym</label><input id="volume" type="range" min="0" max="100" value={volume} disabled={!connected} onChange={e => onVolumeChange(Number(e.target.value))} /></div>
    </footer>
  )
}
