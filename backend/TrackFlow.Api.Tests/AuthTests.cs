using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;

namespace TrackFlow.Api.Tests;

public sealed class AuthTests
{
    [Fact]
    public async Task Anonymous_status_has_csrf_but_no_spotify_tokens()
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        var response = await client.GetAsync("/api/auth/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var status = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(status.GetProperty("configured").GetBoolean());
        Assert.False(status.GetProperty("authenticated").GetBoolean());
        Assert.Equal(JsonValueKind.Null, status.GetProperty("displayName").ValueKind);
        Assert.False(string.IsNullOrEmpty(status.GetProperty("csrfToken").GetString()));
        Assert.Equal(new[] { "authenticated", "configured", "csrfToken", "displayName" },
            status.EnumerateObject().Select(p => p.Name).Order().ToArray());
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task Login_redirect_contains_registered_callback_state_and_pkce()
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        var response = await client.GetAsync("/api/auth/spotify/login");
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var location = response.Headers.Location!;
        Assert.Equal("accounts.spotify.com", location.Host);
        var query = QueryHelpers.ParseQuery(location.Query);
        Assert.Equal("http://127.0.0.1:5173/api/auth/spotify/callback", query["redirect_uri"].ToString());
        Assert.Equal("code", query["response_type"].ToString());
        Assert.Equal("S256", query["code_challenge_method"].ToString());
        Assert.False(string.IsNullOrEmpty(query["state"]));
        Assert.False(string.IsNullOrEmpty(query["code_challenge"]));
        Assert.False(query.ContainsKey("client_secret"));
    }

    [Fact]
    public async Task Invalid_callback_does_not_create_session()
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        var response = await client.GetAsync("/api/auth/spotify/callback?code=bad&state=bad");
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("http://127.0.0.1:5173/?spotify=failed", response.Headers.Location!.ToString());
        var status = await client.GetFromJsonAsync<JsonElement>("/api/auth/status");
        Assert.False(status.GetProperty("authenticated").GetBoolean());
    }

    [Fact]
    public async Task Anonymous_logout_requires_authentication()
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        var response = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("invalid-token")]
    public async Task Authenticated_logout_rejects_missing_or_invalid_csrf(string? token)
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        await SignIn(client);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        if (token is not null) request.Headers.Add("X-CSRF-TOKEN", token);
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var status = await client.GetFromJsonAsync<JsonElement>("/api/auth/status");
        Assert.True(status.GetProperty("authenticated").GetBoolean());
    }

    [Fact]
    public async Task Valid_logout_invalidates_session_even_when_old_cookie_is_replayed()
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        var sessionCookie = await SignIn(client);
        var status = await client.GetFromJsonAsync<JsonElement>("/api/auth/status");
        Assert.True(status.GetProperty("authenticated").GetBoolean());
        Assert.Equal("Test Listener", status.GetProperty("displayName").GetString());
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Add("X-CSRF-TOKEN", status.GetProperty("csrfToken").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(request)).StatusCode);
        status = await client.GetFromJsonAsync<JsonElement>("/api/auth/status");
        Assert.False(status.GetProperty("authenticated").GetBoolean());
        using var replay = factory.NewClient(handleCookies: false);
        replay.DefaultRequestHeaders.Add("Cookie", sessionCookie);
        status = await replay.GetFromJsonAsync<JsonElement>("/api/auth/status");
        Assert.False(status.GetProperty("authenticated").GetBoolean());
    }

    private static async Task<string> SignIn(HttpClient client)
    {
        var login = await client.GetAsync("/api/auth/spotify/login");
        var state = QueryHelpers.ParseQuery(login.Headers.Location!.Query)["state"].ToString();
        var callback = await client.GetAsync(QueryHelpers.AddQueryString(
            "/api/auth/spotify/callback", new Dictionary<string, string?>
            { ["code"] = "test-code", ["state"] = state }));
        Assert.Equal(HttpStatusCode.Redirect, callback.StatusCode);
        Assert.Equal("http://127.0.0.1:5173/?spotify=connected", callback.Headers.Location!.ToString());
        return callback.Headers.GetValues("Set-Cookie")
            .Single(c => c.StartsWith("TrackFlow.Session=")).Split(';')[0];
    }
}

// Real OAuth, cookie and antiforgery middleware; only Spotify's HTTP responses are replaced.
internal sealed class AuthFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Spotify:ClientId", "integration-test-client");
        builder.UseSetting("Spotify:ClientSecret", "integration-test-secret");
        builder.ConfigureServices(services =>
            services.PostConfigure<OAuthOptions>("Spotify", options =>
                options.Backchannel = new HttpClient(new FakeSpotifyHandler())));
    }

    public HttpClient NewClient(bool handleCookies = true) => CreateClient(new()
    {
        BaseAddress = new Uri("http://127.0.0.1:5173"),
        AllowAutoRedirect = false,
        HandleCookies = handleCookies
    });
}

internal sealed class FakeSpotifyHandler : HttpMessageHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.RequestUri!.AbsoluteUri == "https://accounts.spotify.com/api/token")
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            var form = QueryHelpers.ParseQuery(await request.Content!.ReadAsStringAsync(cancellationToken));
            Assert.Equal("test-code", form["code"].ToString());
            Assert.False(string.IsNullOrEmpty(form["code_verifier"]));
            return Json("""{"access_token":"test-access","refresh_token":"test-refresh","token_type":"Bearer","expires_in":3600}""");
        }
        if (request.RequestUri.AbsoluteUri == "https://api.spotify.com/v1/me")
        {
            Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
            Assert.Equal("test-access", request.Headers.Authorization?.Parameter);
            return Json("""{"id":"test-user","display_name":"Test Listener"}""");
        }
        throw new InvalidOperationException("Unexpected outbound request: " + request.RequestUri);
    }

    private static HttpResponseMessage Json(string body) => new(HttpStatusCode.OK)
    { Content = new StringContent(body, Encoding.UTF8, "application/json") };
}
