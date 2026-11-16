# Sidstruktur

- `MusicPage.tsx`: gemensam layout, navigation, sökfält och Spotify-spelare. Behåller delad data vid sidbyte.
- `DiscoverPage.tsx`: hämtar musik och visar låtarna. Sökfältet söker bland hämtade låtar och artister direkt på denna sida.
- `PlaylistsPage.tsx`: skapa, välja, byta namn på och ta bort spellistor samt hantera låtar.
- `../features/music/MusicResults.tsx`: låtlista med spellisteval och laddning av fler låtar.
- `musicPageTypes.ts`: typer för sidornas props.
- `../features/music/PlayerBar.css`: spelarens storlek och reserverat utrymme.

Musikmixen hämtar rock, pop, metal, hiphop, R&B, indie, latino (`latin`) och reggaeton från Spotify för 1990–2026. Genreträffarna styrs av Spotify.
Navigationen använder React-state, inte egna URL:er. Spellistor sparas lokalt per användare.
