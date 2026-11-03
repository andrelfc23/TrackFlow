using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;

namespace TrackFlow.Api.Spotify;

internal static class MusicEndpoints
{
    public static void MapMusicEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/music").RequireAuthorization();
        group.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            try { return await next(context); }
            catch (MusicException e) { return Results.Json(new { error = e.Message }, statusCode: e.Status); }
            catch (HttpRequestException) { return Results.Json(new { error = "Kunde inte nå Spotify." }, statusCode: 502); }
            catch (OperationCanceledException) when (!context.HttpContext.RequestAborted.IsCancellationRequested)
            { return Results.Json(new { error = "Spotify svarade inte i tid." }, statusCode: 504); }
        });
        group.MapGet("/tracks", async (HttpContext context, SpotifyMusic music, int offset = 0) =>
        {
            if (offset < 0 || offset > 1000 || offset % 10 != 0) return Results.BadRequest();
            return Results.Ok(await music.Search(context.User.FindFirstValue("session_id")!, offset, context.RequestAborted));
        });
        // Only the short-lived access token is exposed, for Spotify's browser SDK.
        group.MapPost("/token", async (HttpContext context, IAntiforgery antiforgery, SpotifyMusic music) =>
        {
            try { await antiforgery.ValidateRequestAsync(context); }
            catch (AntiforgeryValidationException) { return Results.BadRequest(); }
            return Results.Ok(new { accessToken = await music.Token(context.User.FindFirstValue("session_id")!, context.RequestAborted) });
        });
        group.MapPost("/play", async (PlayRequest body, HttpContext context, IAntiforgery antiforgery, SpotifyMusic music) =>
        {
            try { await antiforgery.ValidateRequestAsync(context); }
            catch (AntiforgeryValidationException) { return Results.BadRequest(); }
            if (string.IsNullOrWhiteSpace(body.DeviceId) || body.DeviceId.Length > 128 ||
                body.Uri is null || !System.Text.RegularExpressions.Regex.IsMatch(body.Uri, @"^spotify:track:[A-Za-z0-9]{22}$"))
                return Results.BadRequest();
            await music.Play(context.User.FindFirstValue("session_id")!, body, context.RequestAborted);
            return Results.NoContent();
        });
    }
}
