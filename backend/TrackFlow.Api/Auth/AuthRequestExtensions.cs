using TrackFlow.Api.Configuration;

namespace TrackFlow.Api.Auth;

internal static class AuthRequestExtensions
{
    public static WebApplication UseLocalAuthRequestPolicy(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
            throw new InvalidOperationException("Configure HTTPS, public origins and production secret storage before deploying Spotify login.");

        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/api/auth"))
            {
                context.Response.Headers.CacheControl = "no-store";
                // Vite forwards the original host. Keep OAuth redirects on the registered, fixed origin.
                if (context.Request.Host.Value != LocalDevelopment.FrontendHost)
                {
                    if (context.Request.Path == "/api/auth/spotify/login")
                        context.Response.Redirect(LocalDevelopment.FrontendUrl + "/api/auth/spotify/login");
                    else context.Response.StatusCode = 400;
                    return;
                }
            }
            await next();
        });
        return app;
    }
}
