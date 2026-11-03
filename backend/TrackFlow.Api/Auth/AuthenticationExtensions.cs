using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using TrackFlow.Api.Configuration;
using TrackFlow.Api.Spotify;

namespace TrackFlow.Api.Auth;

internal static class AuthenticationExtensions
{
    public static IServiceCollection AddTrackFlowAuthentication(
        this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var spotify = configuration.GetSection("Spotify").Get<SpotifyOptions>() ?? new();
        services.AddSingleton(spotify);
        services.AddMemoryCache();
        services.AddSingleton<SpotifySessionStore>();
        services.AddSingleton<SpotifyClient>();
        services.AddSingleton<SpotifyMusic>();
        services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");
        var auth = services.AddAuthentication(options =>
        {
            options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        });
        auth.AddCookie(options =>
        {
            options.Cookie.Name = "TrackFlow.Session";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = SpotifySessionStore.Lifetime;
            options.SlidingExpiration = false;
            options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
            options.Events.OnValidatePrincipal = async context =>
            {
                var id = context.Principal?.FindFirstValue("session_id");
                var sessions = context.HttpContext.RequestServices.GetRequiredService<SpotifySessionStore>();
                if (id is null || sessions.Get(id) is null)
                {
                    context.RejectPrincipal();
                    await context.HttpContext.SignOutAsync();
                }
            };
        });
        if (spotify.IsConfigured)
        {
            auth.AddOAuth("Spotify", options =>
            {
                options.ClientId = spotify.ClientId!;
                options.ClientSecret = spotify.ClientSecret!;
                options.CallbackPath = "/api/auth/spotify/callback";
                options.AuthorizationEndpoint = "https://accounts.spotify.com/authorize";
                options.TokenEndpoint = "https://accounts.spotify.com/api/token";
                options.UserInformationEndpoint = "https://api.spotify.com/v1/me";
                options.Scope.Add("user-read-private");
                options.Scope.Add("user-read-email");
                options.Scope.Add("streaming");
                options.Scope.Add("user-modify-playback-state");
                options.Scope.Add("user-read-playback-state");
                options.UsePkce = true;
                options.SaveTokens = false; // Tokens must never be serialized into the browser's auth cookie.
                options.CorrelationCookie.SameSite = SameSiteMode.Lax;
                options.CorrelationCookie.SecurePolicy = environment.IsDevelopment()
                    ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
                options.BackchannelTimeout = TimeSpan.FromSeconds(15);
                options.Events.OnCreatingTicket = async context =>
                {
                    var spotifyClient = context.HttpContext.RequestServices.GetRequiredService<SpotifyClient>();
                    var profile = await spotifyClient.GetCurrentUserAsync(
                        context.Backchannel, context.Options.UserInformationEndpoint,
                        context.AccessToken!, context.HttpContext.RequestAborted);
                    var sessionId = Guid.NewGuid().ToString("N");
                    var sessions = context.HttpContext.RequestServices.GetRequiredService<SpotifySessionStore>();
                    sessions.Save(sessionId, new SpotifySession(context.AccessToken!, context.RefreshToken,
                        DateTimeOffset.UtcNow.Add(context.ExpiresIn ?? TimeSpan.FromHours(1))));
                    context.Identity!.AddClaim(new Claim(ClaimTypes.NameIdentifier, profile.Id));
                    context.Identity.AddClaim(new Claim(ClaimTypes.Name, profile.DisplayName));
                    context.Identity.AddClaim(new Claim("session_id", sessionId));
                };
                options.Events.OnRemoteFailure = context =>
                {
                    // Never echo tokens, authorization codes, or provider exceptions into the UI or logs.
                    context.HandleResponse();
                    context.Response.Redirect(LocalDevelopment.FrontendUrl + "/?spotify=failed");
                    return Task.CompletedTask;
                };
            });
        }

        services.AddAuthorization();
        return services;
    }
}
