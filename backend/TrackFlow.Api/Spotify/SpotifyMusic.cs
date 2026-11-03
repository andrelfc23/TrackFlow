using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.Extensions.Options;
using TrackFlow.Api.Auth;

namespace TrackFlow.Api.Spotify;

internal sealed class SpotifyMusic(SpotifySessionStore sessions, IOptionsMonitor<OAuthOptions> options)
{
    private readonly SemaphoreSlim refreshLock = new(1, 1);
    private HttpClient Client => options.Get("Spotify").Backchannel;

    public async Task<string> Token(string id, CancellationToken ct)
    {
        await refreshLock.WaitAsync(ct);
        try
        {
            var session = sessions.Get(id) ?? throw new MusicException(401, "Logga in med Spotify igen.");
            if (session.ExpiresAt > DateTimeOffset.UtcNow.AddMinutes(1)) return session.AccessToken;
            if (session.RefreshToken is null) throw new MusicException(401, "Logga in med Spotify igen.");
            var config = options.Get("Spotify");
            using var request = new HttpRequestMessage(HttpMethod.Post, config.TokenEndpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{config.ClientId}:{config.ClientSecret}")));
            request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
            { ["grant_type"] = "refresh_token", ["refresh_token"] = session.RefreshToken });
            using var response = await Client.SendAsync(request, ct);
            if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized)
            {
                sessions.Remove(id);
                throw new MusicException(401, "Spotify-sessionen har gått ut. Logga in igen.");
            }
            Check(response);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var root = json.RootElement;
            var updated = new SpotifySession(root.GetProperty("access_token").GetString()!,
                root.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() : session.RefreshToken,
                DateTimeOffset.UtcNow.AddSeconds(root.GetProperty("expires_in").GetInt32()));
            // Logout may have removed the session while the refresh request was in flight.
            if (sessions.Get(id) is null) throw new MusicException(401, "Logga in igen.");
            sessions.Save(id, updated);
            return updated.AccessToken;
        }
        finally { refreshLock.Release(); }
    }

    public async Task<object> Search(string id, int offset, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get,
            "https://api.spotify.com/v1/search?type=track&limit=10&offset=" + offset +
            "&q=" + Uri.EscapeDataString("genre:rock year:1990-2026"));
        request.Headers.Authorization = new("Bearer", await Token(id, ct));
        using var response = await Client.SendAsync(request, ct);
        Check(response);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var page = json.RootElement.GetProperty("tracks");
        var items = page.GetProperty("items").EnumerateArray().Where(t => t.ValueKind == JsonValueKind.Object).Select(t =>
        {
            var album = t.GetProperty("album");
            var images = album.GetProperty("images");
            return new
            {
                id = t.GetProperty("id").GetString(), uri = t.GetProperty("uri").GetString(),
                title = t.GetProperty("name").GetString(),
                artist = string.Join(", ", t.GetProperty("artists").EnumerateArray().Select(a => a.GetProperty("name").GetString())),
                milliseconds = t.GetProperty("duration_ms").GetInt32(),
                releaseDate = album.GetProperty("release_date").GetString(),
                image = images.GetArrayLength() > 0 ? images[0].GetProperty("url").GetString() : null,
                url = t.GetProperty("external_urls").GetProperty("spotify").GetString(),
                playable = !t.TryGetProperty("is_playable", out var playable) || playable.GetBoolean()
            };
        }).ToArray();
        return new { items, nextOffset = offset + 10 <= 1000 && page.TryGetProperty("next", out var next)
            && next.ValueKind == JsonValueKind.String ? (int?)(offset + 10) : null };
    }

    public async Task Play(string id, PlayRequest body, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put,
            "https://api.spotify.com/v1/me/player/play?device_id=" + Uri.EscapeDataString(body.DeviceId));
        request.Headers.Authorization = new("Bearer", await Token(id, ct));
        request.Content = JsonContent.Create(new { uris = new[] { body.Uri } });
        using var response = await Client.SendAsync(request, ct);
        Check(response);
    }

    private static void Check(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode) return;
        throw new MusicException((int)response.StatusCode switch { 401 => 401, 403 => 403, 429 => 429, _ => 502 },
            (int)response.StatusCode switch
            {
                401 => "Logga ut och logga in med Spotify igen.",
                403 => "Spotify nekar åtkomst. Kontrollera Premium och logga in igen för att godkänna uppspelning.",
                404 => "Spelaren hittades inte. Anslut spelaren igen.",
                429 => "För många Spotify-anrop. Vänta en stund innan du försöker igen.",
                _ => "Spotify kunde inte slutföra anropet. Försök igen senare."
            });
    }
}

internal sealed record PlayRequest(string DeviceId, string Uri);
internal sealed class MusicException(int status, string message) : Exception(message)
{ public int Status { get; } = status; }
