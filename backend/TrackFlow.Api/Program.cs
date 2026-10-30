using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();
builder.Services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");

var clientId = builder.Configuration["Spotify:ClientId"];
var clientSecret = builder.Configuration["Spotify:ClientSecret"];
var configured = !string.IsNullOrWhiteSpace(clientId) && !string.IsNullOrWhiteSpace(clientSecret);
// This first integration deliberately runs on loopback only. Configure HTTPS before Azure deployment.
var frontend = "http://127.0.0.1:5173";
builder.WebHost.UseUrls("http://127.0.0.1:5008");
var auth = builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
});
auth.AddCookie(options =>
{
    options.Cookie.Name = "TrackFlow.Session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = false;
    options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
    options.Events.OnValidatePrincipal = async context =>
    {
        var id = context.Principal?.FindFirstValue("session_id");
        var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
        if (id is null || !cache.TryGetValue<SpotifySession>(id, out _))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync();
        }
    };
});
if (configured)
{
    auth.AddOAuth("Spotify", options =>
    {
        options.ClientId = clientId!;
        options.ClientSecret = clientSecret!;
        options.CallbackPath = "/api/auth/spotify/callback";
        options.AuthorizationEndpoint = "https://accounts.spotify.com/authorize";
        options.TokenEndpoint = "https://accounts.spotify.com/api/token";
        options.UserInformationEndpoint = "https://api.spotify.com/v1/me";
        options.Scope.Add("user-read-private");
        options.UsePkce = true;
        options.SaveTokens = false; // Tokens must never be serialized into the browser's auth cookie.
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.BackchannelTimeout = TimeSpan.FromSeconds(15);
        options.Events.OnCreatingTicket = async context =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
            request.Headers.Authorization = new("Bearer", context.AccessToken);
            using var response = await context.Backchannel.SendAsync(request, context.HttpContext.RequestAborted);
            response.EnsureSuccessStatusCode();
            using var profile = JsonDocument.Parse(await response.Content.ReadAsStringAsync(context.HttpContext.RequestAborted));
            var spotifyId = profile.RootElement.GetProperty("id").GetString()
                ?? throw new InvalidOperationException("Missing profile identifier.");
            var displayName = profile.RootElement.TryGetProperty("display_name", out var name)
                ? name.GetString() ?? spotifyId : spotifyId;
            var sessionId = Guid.NewGuid().ToString("N");
            var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
            cache.Set(sessionId, new SpotifySession(context.AccessToken!, context.RefreshToken,
                DateTimeOffset.UtcNow.Add(context.ExpiresIn ?? TimeSpan.FromHours(1))), TimeSpan.FromHours(8));
            context.Identity!.AddClaim(new Claim(ClaimTypes.NameIdentifier, spotifyId));
            context.Identity.AddClaim(new Claim(ClaimTypes.Name, displayName));
            context.Identity.AddClaim(new Claim("session_id", sessionId));
        };
        options.Events.OnRemoteFailure = context =>
        {
            // Never echo tokens, authorization codes, or provider exceptions into the UI or logs.
            context.HandleResponse();
            context.Response.Redirect(frontend + "/?spotify=failed");
            return Task.CompletedTask;
        };
    });
}
builder.Services.AddAuthorization();
var app = builder.Build();
if (!app.Environment.IsDevelopment())
    throw new InvalidOperationException("Configure HTTPS, public origins and production secret storage before deploying Spotify login.");

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/auth"))
    {
        context.Response.Headers.CacheControl = "no-store";
        // Vite forwards the original host. Keep OAuth redirects on the registered, fixed origin.
        if (context.Request.Host.Value != "127.0.0.1:5173")
        {
            if (context.Request.Path == "/api/auth/spotify/login")
                context.Response.Redirect(frontend + "/api/auth/spotify/login");
            else context.Response.StatusCode = 400;
            return;
        }
    }
    await next();
});
app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/auth/status", (HttpContext context, IAntiforgery antiforgery) =>
{
    var signedIn = context.User.Identity?.IsAuthenticated == true;
    return Results.Ok(new
    {
        configured,
        authenticated = signedIn,
        displayName = signedIn ? context.User.Identity!.Name : null,
        csrfToken = antiforgery.GetAndStoreTokens(context).RequestToken
    });
});
app.MapGet("/api/auth/spotify/login", () => configured
    ? Results.Challenge(new AuthenticationProperties { RedirectUri = frontend + "/?spotify=connected" }, ["Spotify"])
    : Results.Redirect(frontend + "/?spotify=not-configured"));
// OAuth middleware handles the callback when configured. Otherwise give a safe setup error.
app.MapGet("/api/auth/spotify/callback", () => Results.Redirect(frontend + "/?spotify=not-configured"));
app.MapPost("/api/auth/logout", async (HttpContext context, IAntiforgery antiforgery, IMemoryCache cache) =>
{
    try { await antiforgery.ValidateRequestAsync(context); }
    catch (AntiforgeryValidationException) { return Results.BadRequest(new { error = "Invalid CSRF token." }); }
    if (context.User.FindFirstValue("session_id") is { } id) cache.Remove(id);
    await context.SignOutAsync();
    return Results.NoContent();
}).RequireAuthorization();
app.Run();

// Private server memory only. Profile information sent to the browser never contains these values.
internal sealed record SpotifySession(string AccessToken, string? RefreshToken, DateTimeOffset ExpiresAt);
