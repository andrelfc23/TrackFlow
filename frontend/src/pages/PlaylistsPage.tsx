import { useState } from 'react';
import type { FormEvent } from 'react';
import { TrackList } from '../features/music/TrackList';
import type { PlaylistPageProps } from './musicPageTypes';

export default function PlaylistsPage({ playlists, player, currentList, setTarget, setView, setNotice }: PlaylistPageProps) {
  const [name, setName] = useState('');
  const [playlistFilter, setPlaylistFilter] = useState('');
  function createList(e: FormEvent) {
    e.preventDefault();
    const id = playlists.create(name);
    if (id) {
      setTarget(id);
      setName("");
      setNotice("Spellistan är skapad. Lägg till låtar från Upptäck musik.");
    }
  }
  return (
<>
  <div className="page-heading">
    <p className="eyebrow">SAMLA DITT SOUND</p>
    <h1>Mina spellistor</h1>
    <p>Skapa, redigera och hantera dina spellistor.</p>
  </div>
  <div className="playlist-workspace">
    <div className="playlist-library">
      <form
        className="create-playlist studio-panel"
        onSubmit={createList}
      >
        <label>
          Namn på ny spellista
          <input
            maxLength={80}
            value={name}
            placeholder="Till exempel: Fredagsmix"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <button className="primary-button" disabled={!name.trim()}>
          + Skapa spellista
        </button>
      </form>
      <label className="playlist-search">
        Sök i dina spellistor
        <input
          type="search"
          placeholder="Sök spellista…"
          value={playlistFilter}
          onChange={(e) => setPlaylistFilter(e.target.value)}
        />
      </label>
      <div className="playlist-tiles">
        {playlists.lists
          .filter((p) =>
            p.name
              .toLocaleLowerCase()
              .includes(playlistFilter.toLocaleLowerCase()),
          )
          .map((p, i) => (
            <button
              key={p.id}
              className={`playlist-tile ${currentList?.id === p.id ? "chosen" : ""}`}
              onClick={() => {
                setTarget(p.id);
                setNotice("");
              }}
              aria-pressed={currentList?.id === p.id}
            >
              <div
                className={`playlist-tile-art tile-${i % 3}`}
                aria-hidden="true"
              >
                {p.tracks[0]?.image ? (
                  <img src={p.tracks[0].image} alt="" />
                ) : (
                  <span>♫</span>
                )}
              </div>
              <strong>{p.name}</strong>
              <span>{p.tracks.length} låtar</span>
            </button>
          ))}
      </div>
    </div>
    {currentList ? (
      <section className="studio-panel results-panel playlist-inspector">
        <div className="playlist-cover-heading">
          <div className="selected-cover">
            {currentList.tracks[0]?.image ? (
              <img src={currentList.tracks[0].image} alt="" />
            ) : (
              <span>♫</span>
            )}
          </div>
          <div>
            <p className="eyebrow">SPELLISTA</p>
            <h2>{currentList.name}</h2>
            <p className="muted">
              {currentList.tracks.length} låtar ·{" "}
              {Math.round(
                currentList.tracks.reduce(
                  (sum, t) => sum + t.milliseconds,
                  0,
                ) / 60000,
              )}{" "}
              min
            </p>
            <button
              className="primary-button"
              disabled={
                !player.device ||
                !currentList.tracks.some((t) => t.playable)
              }
              onClick={() => {
                const track = currentList.tracks.find(
                  (t) => t.playable,
                );
                if (track) player.play(track);
              }}
            >
              ▶ Spela första låten
            </button>
          </div>
        </div>
        <div className="playlist-detail">
          <h2>Låtar ({currentList.tracks.length})</h2>
          <button
            className="text-button"
            onClick={() => setView("discover")}
          >
            + Lägg till låtar
          </button>
          <button
            className="text-button"
            onClick={() => {
              const next = window.prompt(
                "Nytt namn",
                currentList.name,
              );
              if (next) playlists.rename(currentList.id, next);
            }}
          >
            Byt namn
          </button>
          <button
            className="text-button danger"
            onClick={() => {
              if (
                window.confirm(
                  `Ta bort spellistan ”${currentList.name}”?`,
                )
              ) {
                playlists.remove(currentList.id);
                setTarget("");
              }
            }}
          >
            Ta bort spellista
          </button>
        </div>
        <TrackList
          tracks={currentList.tracks}
          canPlay={!!player.device}
          onPlay={player.play}
          emptyText="Spellistan är tom. Gå till Upptäck musik och lägg till låtar."
          renderAction={(track) => (
            <button
              className="track-action"
              aria-label={`Ta bort ${track.title} från spellistan`}
              onClick={() =>
                playlists.removeTrack(currentList.id, track.id)
              }
            >
              Ta bort
            </button>
          )}
        />
      </section>
    ) : (
      <div className="studio-empty">
        <span>☷</span>
        <h2>En bra mix börjar med ett namn.</h2>
        <p>
          Skapa din första spellista och fyll den från dina
          sökresultat.
        </p>
      </div>
    )}
  </div>
  <p className="muted storage-note">
    Detta är TrackFlow-spellistor på denna enhet. De synkas inte
    till Spotify eller andra enheter.
  </p>
</>
  );
}
