namespace TrackFlow.Api.Configuration;

// Keep the registered Spotify callback and Vite proxy origin consistent.
internal static class LocalDevelopment
{
    public const string FrontendUrl = "http://127.0.0.1:5173";
    public const string BackendUrl = "http://127.0.0.1:5008";
    public const string FrontendHost = "127.0.0.1:5173";
}
