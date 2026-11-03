import { useSpotifyAccount } from './useSpotifyAccount'

export default function SpotifyAccount() {
  const { status, error, busy, notice, wrongHost, logout, retry } = useSpotifyAccount()
  return <section className="spotify-account" aria-label="Spotify-konto">
    {wrongHost ? <a className="spotify-connect" href="http://127.0.0.1:5173">Öppna Spotify-inloggning</a>
      : status?.authenticated ? <><span className="spotify-user">Spotify · {status.displayName}</span><button className="spotify-disconnect" onClick={logout} disabled={busy}>{busy ? 'Loggar ut…' : 'Logga ut'}</button></>
      : status?.configured ? <a className="spotify-connect" href="/api/auth/spotify/login">Logga in med Spotify</a>
      : status ? <span className="spotify-hint">Spotify behöver konfigureras · se SPOTIFY_SETUP.md</span>
      : !error ? <span className="spotify-hint">Kontrollerar Spotify-anslutning…</span> : null}
    {error && <div className="spotify-message" role="alert">{error} <button onClick={retry}>Försök igen</button></div>}
    {notice && !error && <p className="spotify-message" role="status">{notice}</p>}
  </section>
}
