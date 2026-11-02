namespace TrackFlow.Api.Auth;

// Server-only data: never return this record from an endpoint.
internal sealed record SpotifySession(string AccessToken, string? RefreshToken, DateTimeOffset ExpiresAt);
