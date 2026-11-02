using System.Text.Json;

namespace TrackFlow.Api.Spotify;

// Reuse the OAuth backchannel, including its timeout and transport configuration.
internal sealed class SpotifyClient
{
    public async Task<SpotifyProfile> GetCurrentUserAsync(
        HttpClient httpClient, string endpoint, string accessToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
        request.Headers.Authorization = new("Bearer", accessToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var profile = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var spotifyId = profile.RootElement.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("Missing profile identifier.");
        var displayName = profile.RootElement.TryGetProperty("display_name", out var name)
            ? name.GetString() ?? spotifyId : spotifyId;
        return new SpotifyProfile(spotifyId, displayName);
    }
}
