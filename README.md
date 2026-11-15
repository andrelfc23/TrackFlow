# TrackFlow

Musikapplikation med React/TypeScript och ASP.NET Core. Frontend visar Spotify-sökresultat och har en spelare. Backend hanterar Spotify-inloggning och API-anrop.

Kommandona nedan är för PowerShell i VS Code och utgår från projektmappen `C:\Users\User\TrackFlow`. Anpassa sökvägen om du har klonat projektet någon annanstans.

## Förutsättningar

- .NET SDK 10.
- Node.js 22 (senaste uppdateringen i 22-serien) och npm, samma huvudversion som CI använder.
- Spotify-utvecklarapp och Premium för musikuppspelning.

Kontrollera installationerna:

```powershell
dotnet --version
node --version
npm.cmd --version
```

## Första gången: installera beroenden

Backend:

```powershell
cd C:\Users\User\TrackFlow
dotnet restore backend/TrackFlow.slnx
```

Frontend:

```powershell
cd C:\Users\User\TrackFlow\frontend
npm.cmd ci
```

Kör `npm.cmd ci` igen om projektets låsfil har ändrats när du hämtat ny kod.

## Konfigurera Spotify

Följ [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) för utvecklarappen och behörigheterna. Registrera följande callback-adress exakt:

```text
http://127.0.0.1:5173/api/auth/spotify/callback
```

Spara appuppgifterna lokalt med User Secrets. Ersätt platshållarna med dina egna värden:

```powershell
cd C:\Users\User\TrackFlow\backend\TrackFlow.Api
dotnet user-secrets set "Spotify:ClientId" "DITT_CLIENT_ID"
dotnet user-secrets set "Spotify:ClientSecret" "DITT_CLIENT_SECRET"
```

User Secrets ligger utanför projektet. Lägg inte riktiga hemligheter i Git. Kommandon med hemligheter kan finnas kvar i terminalhistoriken; dela inte historiken eller skärmbilder av dem. Starta om backend efter ändringar.

## Starta applikationen

Öppna två terminaler i VS Code via **Terminal → New Terminal**. Låt båda vara igång.

### Terminal 1: backend

```powershell
cd C:\Users\User\TrackFlow\backend\TrackFlow.Api
dotnet run --launch-profile http
```

Backend kör på `http://127.0.0.1:5008`. Projektets kod anger den adressen även om launchSettings innehåller localhost.

### Terminal 2: frontend

```powershell
cd C:\Users\User\TrackFlow\frontend
npm.cmd run dev
```

Öppna **http://127.0.0.1:5173** i webbläsaren. Använd denna adress även för inloggning. Frontend vidarebefordrar `/api` till backend.

1. Logga in med Spotify och godkänn behörigheterna.
2. Klicka **Hämta rocklåtar**.
3. Klicka **Anslut spelaren** och vänta på anslutningen.
4. Klicka **Spela** vid en låt. **Ladda fler** hämtar nästa sida.

Om behörigheterna har ändrats behöver du logga ut och logga in igen. Backendens sessioner lagras i minnet, så en omstart kräver ny inloggning.

### Stoppa servrarna

Tryck **Ctrl + C** i respektive terminal.

## Kör automatiserade backendtester

```powershell
cd C:\Users\User\TrackFlow
dotnet test backend/TrackFlow.slnx --configuration Release
```

Testerna startar API:t i minnet och simulerar Spotifys svar. De kräver inga riktiga Spotify-uppgifter och du behöver inte starta servrarna manuellt.

## Kontrollera och bygg koden

Frontend:

```powershell
cd C:\Users\User\TrackFlow\frontend
npm.cmd run lint
npm.cmd run build
```

Backend:

```powershell
cd C:\Users\User\TrackFlow
dotnet build backend/TrackFlow.slnx --configuration Release
```

Byggkommandona kontrollerar och skapar byggfiler. För att använda appen lokalt startar du servrarna enligt avsnittet ovan. Backendens nuvarande konfiguration är avsedd för lokal utveckling; Azure kräver ytterligare konfiguration.

## Vanliga startproblem

- **npm.ps1 kan inte köras:** använd `npm.cmd` enligt exemplen ovan.
- **Backend svarar inte:** kontrollera terminal 1 och att backend är igång. Båda servrarna behövs. Kontrollera även att du öppnat `127.0.0.1:5173`.
- **Porten används redan:** kontrollera om servern redan kör i en annan terminal. Stoppa den där med Ctrl + C innan du startar en ny.
- **dotnet känns inte igen:** installera .NET SDK och öppna en ny terminal. Om SDK redan finns i standardmappen kan du starta backend med:

```powershell
cd C:\Users\User\TrackFlow\backend\TrackFlow.Api
& "C:\Program Files\dotnet\dotnet.exe" run --launch-profile http
```

- **Spotify nekar åtkomst:** kontrollera appens tillåtna användare, callback-adress, Premium och beviljade behörigheter. Se Spotify-guiden ovan.

## Projektets delar

- [Frontend](frontend/README.md): komponenter, hooks och API-klient.
- [Backend](backend/TrackFlow.Api/README.md): autentisering, endpoints och tjänster.
- [Integrationstester](backend/TrackFlow.Api.Tests/README.md): testmiljö och körning.
- [GitHub Actions](.github/workflows/ci.yml): automatiska kontroller vid push och pull request mot main.
