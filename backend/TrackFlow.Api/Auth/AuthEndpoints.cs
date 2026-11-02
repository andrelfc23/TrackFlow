using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using TrackFlow.Api.Configuration;
using TrackFlow.Api.Contracts;
using TrackFlow.Api.Spotify;

namespace TrackFlow.Api.Auth;

internal static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/auth/status", (HttpContext context, IAntiforgery antiforgery, SpotifyOptions spotify) =>
        {
            var signedIn = context.User.Identity?.IsAuthenticated == true;
            return Results.Ok(new AuthStatusResponse(
                spotify.IsConfigured, signedIn,
                signedIn ? context.User.Identity!.Name : null,
                antiforgery.GetAndStoreTokens(context).RequestToken));
        });
        endpoints.MapGet("/api/auth/spotify/login", (SpotifyOptions spotify) => spotify.IsConfigured
            ? Results.Challenge(new AuthenticationProperties { RedirectUri = LocalDevelopment.FrontendUrl + "/?spotify=connected" }, ["Spotify"])
            : Results.Redirect(LocalDevelopment.FrontendUrl + "/?spotify=not-configured"));
        // OAuth middleware handles the callback when configured. Otherwise give a safe setup error.
        endpoints.MapGet("/api/auth/spotify/callback", () => Results.Redirect(LocalDevelopment.FrontendUrl + "/?spotify=not-configured"));
        endpoints.MapPost("/api/auth/logout", async (HttpContext context, IAntiforgery antiforgery, SpotifySessionStore sessions) =>
        {
            try { await antiforgery.ValidateRequestAsync(context); }
            catch (AntiforgeryValidationException) { return Results.BadRequest(new { error = "Invalid CSRF token." }); }
            if (context.User.FindFirstValue("session_id") is { } id) sessions.Remove(id);
            await context.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization();
        return endpoints;
    }
}
