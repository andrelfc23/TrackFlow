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

## Upptäck musik och egna spellistor

Gränssnittet har tre vyer: Upptäck musik, Sökresultat och Mina spellistor.
Inga genrer är förvalda. Välj en eller flera och välj ett årintervall eller
flera årtionden mellan 1960 och 2026. Ett specifikt år anges i båda årfälten.
Sökningen hämtar upp till tio låtar per genre/tidsperiod, blandar resultaten
och tar bort dubbletter. Ladda fler fortsätter respektive sökning.

Frontend verifierar genre och år i API-svaret. Om den gamla backendprocessen
fortfarande kör visas en uppmaning att starta om den i stället för fel rockresultat.

Mina spellistor lagras i localStorage, separat per Spotify-användar-ID.
Det är lokal lagring på samma webbläsarprofil och inte en säker databas:
andra med åtkomst till profilen kan läsa lagringen. Ingen Spotify-token lagras där.
Listorna exporteras inte till Spotify och synkas inte mellan enheter.
Rensad webbplatsdata tar bort listorna. UI stödjer skapa, byta namn, lägga till,
ta bort låtar och ta bort spellistor. Låtsökning och längdfilter i resultatvyn
filtrerar bara redan hämtade resultat. Tempo, stämning och popularitet är inte implementerade.
