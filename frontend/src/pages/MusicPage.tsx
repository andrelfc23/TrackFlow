import SpotifyAccount from '../features/auth/SpotifyAccount'
import { useTrackSearch } from '../features/music/useTrackSearch'
import { useSpotifyPlayer } from '../features/music/useSpotifyPlayer'
import { TrackList } from '../features/music/TrackList'
import { PlayerBar } from '../features/music/PlayerBar'

export default function MusicPage() {
  const searchState = useTrackSearch()
  const { tracks, next, busy, search } = searchState
  const player = useSpotifyPlayer()
  const { device, connecting, state, volume, connect, play } = player
  const error = [searchState.error, player.error].filter(Boolean).join(' ')
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#main">TrackFlow</a><SpotifyAccount /></header>
    <main id="main" className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
      <section className="intro text-center"><p className="eyebrow">MUSIK FRÅN SPOTIFY</p><h1>Din musik. <span>Ditt flow.</span></h1><p className="subtitle">Rock · 1990–2026</p></section>
      <section className="playlist" aria-labelledby="playlist-title">
        <div className="playlist-hero"><div className="cover cover-rock" aria-hidden="true"><div className="record" /><span>TRACKFLOW / ROCK</span></div><div className="playlist-info"><p className="eyebrow">SÖKRESULTAT FRÅN SPOTIFY</p><h2 id="playlist-title">Rock 1990–2026</h2><p className="playlist-meta">Logga in, hämta låtar och anslut spelaren med Premium.</p><button className="primary-button" disabled={connecting || !!device} onClick={connect}>{device ? 'Spelaren är ansluten' : connecting ? 'Ansluter…' : 'Anslut spelaren'}</button></div></div>
        {error && <p role="alert" className="spotify-message" style={{ padding: 20 }}>{error}</p>}
        <TrackList tracks={tracks} canPlay={!!device} onPlay={play} />
        <div style={{ padding: 24 }}><button className="primary-button" disabled={busy || next === null} onClick={search}>{busy ? 'Hämtar…' : next === null ? 'Inga fler resultat' : tracks.length ? 'Ladda fler' : 'Hämta rocklåtar'}</button><p className="playlist-meta" aria-live="polite">{tracks.length} låtar visas</p></div>
      </section>
      <p className="demo-note">Resultaten kommer från Spotifys sökning. Årtalet avser albumutgåvan. Uppspelning kräver Premium och tillgänglighet för ditt konto.</p>
    </main>
    <PlayerBar state={state} connected={!!device} volume={volume}
      onToggle={player.toggle} onSeek={player.seek} onVolumeChange={player.changeVolume} />
  </div>
}
