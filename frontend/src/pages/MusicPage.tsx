import { useState } from "react";
import type { FormEvent } from "react";
import type { SpotifyAccountState } from "../features/auth/useSpotifyAccount";
import SpotifyAccount from "../features/auth/SpotifyAccount";
import { useTrackSearch } from "../features/music/useTrackSearch";
import { useSpotifyPlayer } from "../features/music/useSpotifyPlayer";
import { usePlaylists } from "../features/playlists/usePlaylists";
import DiscoverPage from './DiscoverPage';
import PlaylistsPage from './PlaylistsPage';
import type { MusicView } from './musicPageTypes';
import { PlayerBar } from "../features/music/PlayerBar";
import "./MusicPage.css";
import "../features/music/PlayerBar.css";


export default function MusicPage({
  account,
}: {
  account: SpotifyAccountState;
}) {
  const [view, setView] = useState<MusicView>("discover");
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [trackFilter, setTrackFilter] = useState("");

  const results = useTrackSearch();
  const player = useSpotifyPlayer();
  const playlists = usePlaylists(account.status?.userId ?? "");
  const currentList =
    playlists.lists.find((p) => p.id === target) ?? playlists.lists[0];
  const visible = results.tracks.filter((t) =>
    `${t.title} ${t.artist}`
      .toLocaleLowerCase()
      .includes(trackFilter.toLocaleLowerCase()),
  );
  async function discover(genre?: string) {
    setNotice("");
    await results.search({
      genres: genre ? [genre] : ["rock", "pop", "metal", "hip-hop", "r-n-b", "indie", "latin", "reggaeton"],
      ranges: [{ from: 1990, to: 2026 }],
    });
  }
  function search(e: FormEvent) {
    e.preventDefault();
    setView("discover");
    if (!results.searched) void discover();
  }
  // Keep shared state here so navigation does not reconnect Spotify or reset results.
  const pageProps = { results, visible, playlists, player, currentList, setTarget, setView, setNotice };
  return (
    <div className={`app-shell studio view-${view}`}>
      <aside className="studio-sidebar">
        <a className="brand" href="#main">
          <span className="wave" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          TrackFlow
        </a>
        <p className="nav-caption">DITT MUSIKRUM</p>
        <nav aria-label="Huvudmeny">
          {(
            [
              { id: "discover", title: "Upptäck musik", icon: "◈" },
              { id: "playlists", title: "Mina spellistor", icon: "☷" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => setView(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.title}
              {item.id === "playlists" && (
                <small>{playlists.lists.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-library">
          <h2>
            Mina spellistor{" "}
            <button
              aria-label="Skapa spellista"
              onClick={() => setView("playlists")}
            >
              +
            </button>
          </h2>
          {playlists.lists.slice(0, 5).map((p) => (
            <button
              className="sidebar-list"
              key={p.id}
              onClick={() => {
                setTarget(p.id);
                setView("playlists");
              }}
            >
              <span className="mini-cover">
                {p.tracks[0]?.image ? (
                  <img src={p.tracks[0].image} alt="" />
                ) : (
                  "♫"
                )}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>{p.tracks.length} låtar</small>
              </span>
            </button>
          ))}
          {!playlists.lists.length && (
            <p className="muted">Dina spellistor visas här.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <span className="live-dot" /> Ansluten till Spotify
          <p>
            Musiken du gillar.
            <br />
            På ditt sätt.
          </p>
        </div>
      </aside>
      <div className="studio-content">
        <header className="studio-header">
          <button
            className="back-button"
            aria-label="Till Upptäck musik"
            onClick={() => setView("discover")}
          >
            ‹
          </button>
          <form className="global-search" onSubmit={search}>
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Sök bland hämtade låtar"
              type="search"
              placeholder="Sök bland hämtade låtar och artister…"
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
            />
            <button type="submit">Sök</button>
          </form>
          <SpotifyAccount account={account} />
        </header>
        <main id="main">
          {view === "discover" && <DiscoverPage {...pageProps} discover={discover} />}
          {view === "playlists" && <PlaylistsPage {...pageProps} />}
          {notice && (
            <p className="studio-notice" role="status">
              {notice}
            </p>
          )}
          {playlists.error && (
            <p className="studio-error" role="alert">
              {playlists.error}
            </p>
          )}
          <div className="connection-strip">
            <div>
              <strong>
                {player.device
                  ? "● Spotify-spelaren är redo"
                  : "Redo att lyssna?"}
              </strong>
              <p className="muted">
                Anslut spelaren med Premium och välj en låt.
              </p>
            </div>
            <button
              className="genre"
              disabled={player.connecting || !!player.device}
              onClick={player.connect}
            >
              {player.device
                ? "Ansluten"
                : player.connecting
                  ? "Ansluter…"
                  : "Anslut spelaren"}
            </button>
          </div>
          {player.error && (
            <p className="studio-error" role="alert">
              {player.error}
            </p>
          )}
          <p className="studio-footnote">
            Musik från Spotify · Dina egna mixar i TrackFlow
          </p>
        </main>
      </div>
      <PlayerBar
        state={player.state}
        connected={!!player.device}
        volume={player.volume}
        onToggle={player.toggle}
        onSeek={player.seek}
        onVolumeChange={player.changeVolume}
      />
    </div>
  );
}
