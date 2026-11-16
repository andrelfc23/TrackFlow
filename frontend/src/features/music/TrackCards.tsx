import type { ReactNode } from 'react';
import type { Track } from './types';
import { formatTime } from '../../utils/formatTime';

type Props = { tracks: Track[]; canPlay: boolean; onPlay: (track: Track) => void; emptyText: string; renderAction: (track: Track) => ReactNode };
export function TrackCards({ tracks, canPlay, onPlay, emptyText, renderAction }: Props) {
  if (!tracks.length) return <div className="studio-empty" role="status"><span aria-hidden="true">♫</span><p>{emptyText}</p></div>;
  return <div className="discovery-track-grid">{tracks.map(track => <article className="discovery-track-card" key={track.id}>
    <div className="card-cover">{track.image ? <img src={track.image} alt={`Omslag till ${track.title}`} loading="lazy"/> : <div className="card-cover-fallback" aria-hidden="true">♫</div>}<button className="card-play" disabled={!canPlay || !track.playable} onClick={() => onPlay(track)} aria-label={`Spela ${track.title}`}>▶</button></div>
    <div className="card-info"><h3>{track.title}</h3><p>{track.artist}</p><div className="card-meta"><span>{formatTime(track.milliseconds)}</span><a href={track.url} target="_blank" rel="noreferrer" aria-label={`Öppna ${track.title} i Spotify`}>Spotify ↗</a></div>{renderAction(track)}</div>
  </article>)}</div>;
}
