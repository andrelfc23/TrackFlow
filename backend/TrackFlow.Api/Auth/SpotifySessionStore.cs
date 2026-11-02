using Microsoft.Extensions.Caching.Memory;

namespace TrackFlow.Api.Auth;

internal sealed class SpotifySessionStore(IMemoryCache cache)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(8);

    public void Save(string sessionId, SpotifySession session) =>
        cache.Set(sessionId, session, Lifetime);

    public SpotifySession? Get(string sessionId) =>
        cache.TryGetValue<SpotifySession>(sessionId, out var session) ? session : null;

    public void Remove(string sessionId) => cache.Remove(sessionId);
}
