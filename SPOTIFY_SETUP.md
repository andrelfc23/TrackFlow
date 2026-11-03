# Spotify-inloggning i TrackFlow

Inloggningen är implementerad för lokal utveckling. Den låter dig ansluta ditt Spotify-konto och logga ut. Spellistan och spelaren använder fortfarande exempeldata – riktig uppspelning är nästa separata steg. Ett Premium-abonnemang ersätter inte registreringen av en utvecklarapp.

## 1. Registrera din Spotify-app

1. Öppna https://developer.spotify.com/dashboard och logga in själv.
2. Skapa en app med namnet **TrackFlow** och beskrivningen **Privat musikprojekt för att lära mig React, .NET och API-integration**.
3. Välj **Web API** om du får välja API. Web Playback SDK kan aktiveras när uppspelning läggs till.
4. Lägg till exakt denna Redirect URI i appens inställningar:

   `http://127.0.0.1:5173/api/auth/spotify/callback`

5. Spara inställningarna. Om Spotify visar användarhantering/allowlist, kontrollera att ditt eget Spotify-konto är tillåtet.
6. Hitta **Client ID** och **Client Secret**. Dela aldrig Client Secret i chatten eller på GitHub. Registrering och tillgänglighet styrs av Spotify; om appregistrering inte erbjuds kan inloggningen inte slutföras ännu.

## 2. Spara uppgifterna lokalt

I VS Code-terminalen:

```powershell
cd C:\Users\User\TrackFlow\backend\TrackFlow.Api
dotnet user-secrets set "Spotify:ClientId" "DITT_CLIENT_ID"
dotnet user-secrets set "Spotify:ClientSecret" "DIN_CLIENT_SECRET"
```

Byt platshållarna mot värden från din egen app. Kommandona skriver till .NET User Secrets utanför repot. User Secrets är lokal utvecklingslagring, inte ett krypterat produktionsvalv. Kommandon med inklistrad hemlighet kan sparas i terminalhistorik; använd gärna **Manage User Secrets** i din .NET-editor om den funktionen finns och redigera den externa secrets-filen direkt. Lägg aldrig uppgifter i React, `.env` med `VITE_`-prefix eller `appsettings.json`.

## 3. Starta båda delarna

Terminal 1:

```powershell
cd C:\Users\User\TrackFlow\backend\TrackFlow.Api
dotnet run --launch-profile http
```

Terminal 2:

```powershell
cd C:\Users\User\TrackFlow\frontend
npm.cmd run dev
```

Starta om Vite om den redan kördes före proxyändringen. Öppna **http://127.0.0.1:5173** och klicka på **Logga in med Spotify**. Spotify visar sin egen inloggnings-/samtyckessida. Efter godkännande återkommer du till TrackFlow och ditt visningsnamn visas. TrackFlow tar aldrig emot ditt Spotify-lösenord. Premium-status kontrolleras inte i denna inloggningsversion.

## 4. Felsökning

- **Behöver konfigureras:** spara båda User Secrets och starta om backend.
- **Backend svarar inte:** kontrollera att backend kör på port 5008 och att Vite startats om.
- **Invalid redirect URI:** adressen i dashboarden måste vara identisk med adressen ovan. Spotify tillåter inte `localhost` som loopback-redirect; använd `127.0.0.1`.
- **Inloggningen misslyckades:** kontrollera hemlighet, appens tillåtna användare och att samtycke godkändes. Felaktig eller saknad OAuth-state avvisas också.
- **Port 5173 upptagen:** stoppa den gamla Vite-processen. Projektet använder strictPort så att redirect-URI:n inte ändras automatiskt.

## Säkerhet och nuvarande begränsningar

- ASP.NET Cores OAuth-hanterare sköter state, korrelationscookie och PKCE. Tokens går inte till React eller auth-cookien.
- Access-/refresh tokens finns bara i serverminnet under en session på högst åtta timmar. Backend-omstart kräver ny inloggning.
- Inga Spotify-dataanrop eller SDK-token-endpoints finns ännu. Tokenförnyelse införs innan sådana funktioner byggs.
- Utloggning kräver POST och CSRF-token och raderar serverns session. För att även återkalla Spotifys appbehörighet används Spotify-kontots appsida.
- Backend binder bara till loopback. Denna implementation stoppar avsiktligt i produktionsläge tills HTTPS, domäner, beständig nyckelhantering och produktionshemligheter har konfigurerats.

Officiella källor: [Authorization Code](https://developer.spotify.com/documentation/web-api/tutorials/code-flow), [Redirect URI](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

## Riktig rockmusik och uppspelning

Den nya musikvyn söker genre:rock year:1990-2026, tio resultat åt gången.
Detta är sökresultat, inte en fullständig katalog eller en sparad Spotify-spellista.

1. Starta om backend och frontend efter uppdateringen.
2. Logga ut och logga in igen. Godkänn de nya behörigheterna för streaming och uppspelning.
3. Klicka Hämta rocklåtar, sedan Anslut spelaren. Vänta tills spelaren är ansluten.
4. Klicka Spela på en låt. Ladda fler hämtar nästa sida.
5. Premium och tillåtelse att använda utvecklarappen krävs. Web Playback SDK ska vara valt i appens Spotify-inställningar. Callback-adressen är oförändrad.

Säkerhetsändring: endast en kortlivad access token lämnas till Spotify SDK i
webbläsarens minne via POST /api/music/token. Den sparas inte i localStorage.
Refresh token och ClientSecret stannar i backend. Token- och play-endpoints
kräver lokal inloggning och antiforgery-token och svaren har no-store.
Backend förnyar tokens när de närmar sig utgång. Gamla sessioner saknar nya
behörigheter och kräver ny inloggning. Sessioner försvinner vid omstart.

Testerna simulerar Spotify. Verifiera manuellt med Premium: första söksidan,
Ladda fler, anslutning, låtval, paus/återuppta, position, volym och utloggning.
Äldre avsnitt om enbart demo, inga tokens till frontend och avsaknad av
förnyelse beskriver den tidigare versionen och ersätts av detta avsnitt.
