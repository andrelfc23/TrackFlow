# Integrationstester

Kör från repots rot:

```powershell
dotnet test backend/TrackFlow.slnx --configuration Release
```

Sju testfall kontrollerar anonym status, OAuth-omdirigering med PKCE,
ogiltig callback, anonym utloggning, saknad/felaktig CSRF-token samt korrekt
utloggning inklusive återanvändning av en gammal cookie.

WebApplicationFactory startar API:t i minnet. Inga servrar behöver startas manuellt.
OAuth, cookies, sessionscache och antiforgery körs på riktigt. Endast Spotifys
HTTP-svar ersätts av FakeSpotifyHandler, som aldrig skickar nätverksanrop.
Testkonfiguration använder påhittade klientuppgifter. Varje test har en egen app.

Testerna verifierar backendflödet, inte Spotifys riktiga godkännandesida,
Premium, musikuppspelning eller frontendens gränssnitt.
