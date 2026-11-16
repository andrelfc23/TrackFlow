import type { ReactNode } from "react";
import type { Track } from "./types";
import { formatTime } from "../../utils/formatTime";
type Props = {
  tracks: Track[];
  canPlay: boolean;
  onPlay: (track: Track) => void;
  renderAction?: (track: Track) => ReactNode;
  emptyText?: string;
};
export function TrackList({
  tracks,
  canPlay,
  onPlay,
  renderAction,
  emptyText = "Inga låtar att visa.",
}: Props) {
  return (
    <div className="studio-track-list">
      <div className="track-table-head" aria-hidden="true">
        <span>#</span>
        <span>Titel</span>
        <span>Artist</span>
        <span>Längd</span>
        <span>Åtgärder</span>
      </div>
      {tracks.map((track, index) => (
        <div key={track.id} className="studio-track">
          <span className="track-order">{index + 1}</span>
          {track.image ? (
            <img
              src={track.image}
              alt=""
              width="44"
              height="44"
              loading="lazy"
            />
          ) : (
            <span className="track-placeholder" aria-hidden="true">
              ♫
            </span>
          )}
          <div className="studio-track-name">
            <strong>{track.title}</strong>
            <span className="mobile-track-artist">{track.artist}</span>
            <a href={track.url} target="_blank" rel="noreferrer">
              Öppna i Spotify ↗
            </a>
          </div>
          <span className="track-artist">{track.artist}</span>
          <span className="track-time">{formatTime(track.milliseconds)}</span>
          <button
            className="track-action play-action"
            disabled={!canPlay || !track.playable}
            onClick={() => onPlay(track)}
            aria-label={`Spela ${track.title}`}
          >
            {track.playable ? "▶ Spela" : "Ej tillgänglig"}
          </button>
          {renderAction?.(track)}
        </div>
      ))}
      {!tracks.length && (
        <div className="studio-empty">
          <span aria-hidden="true">♫</span>
          <p>{emptyText}</p>
        </div>
      )}
    </div>
  );
}
