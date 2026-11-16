import { TrackCards } from './TrackCards';
import type { MusicResultsProps } from '../../pages/musicPageTypes';

export function MusicResults({ title, results, visible, playlists, player, currentList, setTarget, setView, setNotice }: MusicResultsProps & { title: string }) {
  return <>
<div className="music-toolbar">
  <div>
    <h2>
      {title}
    </h2>
    <p className="muted">
      {results.tracks.length} låtar hämtade från Spotify ·
      {results.filters?.genres.length === 1 ? results.filters.genres[0] : 'blandade genrer'} · 1990–2026
    </p>
  </div>
  <div className="toolbar-actions">
    <label>
      Lägg till i
      <select
        aria-label="Välj spellista"
        value={currentList?.id ?? ""}
        onChange={(e) => setTarget(e.target.value)}
      >
        <option value="" disabled>
          Välj en spellista
        </option>
        {playlists.lists.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
    <button
      className="outline-button"
      onClick={() => setView("playlists")}
    >
      + Skapa spellista
    </button>
  </div>
</div>
<section className="results-panel">
  <TrackCards
    tracks={visible}
    canPlay={!!player.device}
    onPlay={player.play}
    emptyText={
      results.busy
        ? "Hämtar musik från Spotify…"
        : results.searched
          ? "Inga hämtade låtar matchar din sökning."
          : "Tryck på Upptäck låtar för att hämta din första mix från Spotify."
    }
    renderAction={(track) => (
      <button
        className="track-action"
        disabled={
          !!currentList?.tracks.some((t) => t.id === track.id)
        }
        aria-label={`Lägg till ${track.title} i ${currentList?.name ?? "spellista"}`}
        onClick={() => {
          if (!currentList) {
            setView("playlists");
            setNotice(
              "Skapa en spellista och lägg sedan till låten från Upptäck musik.",
            );
            return;
          }
          if (playlists.add(currentList.id, track))
            setNotice(
              `${track.title} har lagts till i ${currentList.name}.`,
            );
        }}
      >
        {currentList?.tracks.some((t) => t.id === track.id)
          ? "✓ Tillagd"
          : "+ Lägg till i spellista"}
      </button>
    )}
  />
</section>
<div className="load-more">
  {results.searched && results.hasMore && (
    <button
      className="outline-button"
      disabled={results.busy}
      onClick={() => results.search()}
    >
      {results.busy ? "Hämtar…" : "Ladda fler"}
    </button>
  )}
  {results.error && (
    <>
      <p role="alert" className="studio-error">
        {results.error}
      </p>
      <button
        className="text-button"
        disabled={results.busy}
        onClick={() => results.search()}
      >
        Försök igen
      </button>
    </>
  )}
</div>
  </>;
}
