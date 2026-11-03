# TrackFlow frontend

React och TypeScript. Koden är organiserad efter funktion och ansvar.

```text
src/
  App.tsx                       Startkomponent
  pages/MusicPage.tsx            Sidlayout och sammansättning
  api/client.ts                 Gemensamma musikanrop, HTTP-fel och CSRF
  features/auth/
    SpotifyAccount.tsx          Kontots gränssnitt
    useSpotifyAccount.ts        Inloggningsstatus och utloggning
    sessionEvents.ts            Meddelande om avslutad session
  features/music/
    musicApi.ts                 Typade sök-, token- och uppspelningsanrop
    useTrackSearch.ts           Låtlista, sidindelning och söktillstånd
    useSpotifyPlayer.ts         SDK-livscykel och uppspelningskontroller
    spotifySdk.ts               Laddar Spotifys externa SDK en gång
    types.ts                    Musik- och SDK-typer
    TrackList.tsx               Visar låtar och skickar klick vidare
    PlayerBar.tsx               Visar spelarkontroller
  utils/formatTime.ts            Formaterar millisekunder
  App.css                       Befintlig sidstyling
  index.css                     Globala stilar och Tailwind
```

## Ansvar och dataflöde

MusicPage kopplar hooks till visuella komponenter via props. TrackList och
PlayerBar gör inga nätverksanrop och äger inte SDK-instansen. useTrackSearch
hämtar nästa sida via musicApi och api/client. useSpotifyPlayer äger spelaren,
dess händelser och städning vid utloggning eller avmontering.

Auth-hooken hanterar status och utloggning och skickar LOGOUT_EVENT efter
avslutad session. Båda musikhookarna lyssnar och tömmer sitt tillstånd.
API-adresser, CSRF-skydd och lagring av tokens är oförändrade. Kortlivade
access tokens används endast i minnet för SDK; hemligheter hör inte hemma här.

## Körning och kontroll

Kör `npm.cmd run dev` i denna mapp och starta backend separat.
Öppna http://127.0.0.1:5173. Kör `npm.cmd run lint` och `npm.cmd run build`.
Riktig uppspelning kräver Spotify Premium och rätt behörigheter.
