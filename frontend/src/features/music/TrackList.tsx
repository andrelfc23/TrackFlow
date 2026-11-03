import type { Track } from './types'
import { formatTime } from '../../utils/formatTime'

type Props = { tracks: Track[]; canPlay: boolean; onPlay: (track: Track) => void }
export function TrackList({ tracks, canPlay, onPlay }: Props) {
  return (
        <div className="track-list">
          {tracks.map((track, i) => <div key={track.id} className="track-row" style={{ gridTemplateColumns: '48px minmax(0, 1fr) auto auto' }}>
            <span>{track.image ? <img src={track.image} alt="" width="40" height="40" /> : i + 1}</span>
            <span className="track-title">{track.title}<span style={{ display: 'block', fontSize: 13, fontWeight: 400 }}>{track.artist} · {track.releaseDate?.slice(0, 4)} · {formatTime(track.milliseconds)}</span><a href={track.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Öppna i Spotify ↗</a></span>
            <button className="genre" disabled={!canPlay || !track.playable} onClick={() => onPlay(track)} aria-label={`Spela ${track.title}`}>{track.playable ? 'Spela' : 'Ej tillgänglig'}</button>
          </div>)}
          {!tracks.length && <p className="empty-state">Hämta de första tio låtarna efter att du loggat in.</p>}
        </div>
  )
}
