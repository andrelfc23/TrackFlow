import { useState } from "react";
import type { SpotifyAccountState } from "../features/auth/useSpotifyAccount";
import "./LoginPage.css";

type Props = { account: SpotifyAccountState };
export default function LoginPage({ account }: Props) {
  const { status, error, busy, wrongHost, retry, logout } = account;
  const [help, setHelp] = useState(false);
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <a className="brand" href="/">
          TrackFlow
        </a>
        <p className="eyebrow">DIN MUSIK. DITT KONTO.</p>
        <h1 id="login-title">Logga in till TrackFlow</h1>
        <p>
          Logga in hos Spotify i samma flik. Efter inloggning och eventuellt
          godkännande kommer du automatiskt tillbaka till din dashboard i
          TrackFlow.
        </p>
        {wrongHost ? (
          <a className="primary-button" href="http://127.0.0.1:5173">
            Öppna inloggningssidan
          </a>
        ) : status?.authenticated ? (
          <>
            <p>
              Inloggad som <strong>{status.displayName}</strong>.
            </p>
            <button className="primary-button" disabled={busy} onClick={logout}>
              Logga ut från TrackFlow
            </button>
          </>
        ) : status?.configured ? (
          <a
            className="primary-button"
            href="/api/auth/spotify/login"
            target="_self"
          >
            Logga in på Spotify
          </a>
        ) : status ? (
          <p>
            Spotify-anslutningen är inte konfigurerad. Kontakta den som ansvarar
            för TrackFlow.
          </p>
        ) : !error ? (
          <p role="status">Kontrollerar anslutningen…</p>
        ) : null}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button className="genre" onClick={retry}>
              Försök igen
            </button>
          </div>
        )}
        <button
          className="login-help-button"
          aria-expanded={help}
          onClick={() => setHelp(!help)}
        >
          Visas fel Spotify-konto?
        </button>
        {help && (
          <div className="login-help">
            <p>
              På en delad dator kan Spotify komma ihåg den senaste användaren.
              Ett nytt vanligt fönster delar samma inloggning.
            </p>
            <p>
              Använd knappen Logga in på Spotify ovan. Den öppnar Spotifys
              inloggningsflöde i samma flik och skickar dig tillbaka hit efter
              godkännandet.
            </p>
            <p>
              Om Spotify redan känner igen ett konto kan godkännandesidan visas
              direkt. TrackFlow kan inte tvinga Spotify att fråga efter lösenord
              igen. Använd Spotifys kontobyte eller en separat webbläsarprofil
              om fel konto visas.
            </p>
            <p>
              Du kan också använda en egen webbläsarprofil eller ett privat
              fönster utan en befintlig Spotify-inloggning.
            </p>
          </div>
        )}
        <p className="login-footnote">
          TrackFlow tar aldrig emot ditt Spotify-lösenord. Spotify kan
          återanvända en befintlig inloggning och kan be dig godkänna åtkomst.
        </p>
      </section>
    </main>
  );
}
