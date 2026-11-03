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


    [Fact]
    public async Task Music_endpoints_require_login()
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/music/tracks")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/music/token", new { })).StatusCode);
    }

    [Fact]
    public async Task Search_uses_fixed_filter_and_pagination_and_refreshes_expiring_token()
    {
        using var factory = new AuthFactory(true);
        using var client = factory.NewClient();
        await SignIn(client);
        var response = await client.GetAsync("/api/music/tracks?offset=10");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Test Rock", page.GetProperty("items")[0].GetProperty("title").GetString());
        Assert.Equal(20, page.GetProperty("nextOffset").GetInt32());
        Assert.Equal(1, factory.Spotify.RefreshCount);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/music/tracks?offset=1001")).StatusCode);
    }

    [Fact]
    public async Task Token_and_play_require_csrf_and_forward_only_valid_track()
    {
        using var factory = new AuthFactory();
        using var client = factory.NewClient();
        await SignIn(client);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/music/token", new { })).StatusCode);
        var body = new { deviceId = "test-device", uri = "spotify:track:0123456789012345678901" };
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/music/play", body)).StatusCode);
        var status = await client.GetFromJsonAsync<JsonElement>("/api/auth/status");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", status.GetProperty("csrfToken").GetString());
        var tokenResponse = await client.PostAsJsonAsync("/api/music/token", new { });
        Assert.True(tokenResponse.Headers.CacheControl?.NoStore);
        var token = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("test-access", token.GetProperty("accessToken").GetString());
        Assert.Single(token.EnumerateObject());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/music/play", new { deviceId = "test-device", uri = "bad" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/music/play", body)).StatusCode);
        Assert.Equal(1, factory.Spotify.PlayCount);
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
internal sealed class AuthFactory(bool expireToken = false) : WebApplicationFactory<Program>
{
    public FakeSpotifyHandler Spotify { get; } = new(expireToken);
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Spotify:ClientId", "integration-test-client");
        builder.UseSetting("Spotify:ClientSecret", "integration-test-secret");
        builder.ConfigureServices(services =>
            services.PostConfigure<OAuthOptions>("Spotify", options =>
                options.Backchannel = new HttpClient(Spotify)));
    }

    public HttpClient NewClient(bool handleCookies = true) => CreateClient(new()
    {
        BaseAddress = new Uri("http://127.0.0.1:5173"),
        AllowAutoRedirect = false,
        HandleCookies = handleCookies
    });
}

internal sealed class FakeSpotifyHandler(bool expireToken = false) : HttpMessageHandler
{
    public int RefreshCount { get; private set; }
    public int PlayCount { get; private set; }
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.RequestUri!.AbsoluteUri == "https://accounts.spotify.com/api/token")
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            var form = QueryHelpers.ParseQuery(await request.Content!.ReadAsStringAsync(cancellationToken));
            if (form["grant_type"] == "refresh_token")
            {
                RefreshCount++;
                Assert.Equal("test-refresh", form["refresh_token"].ToString());
                return Json("""{"access_token":"refreshed-access","token_type":"Bearer","expires_in":3600}""");
            }
            Assert.Equal("test-code", form["code"].ToString());
            Assert.False(string.IsNullOrEmpty(form["code_verifier"]));
            return Json("""{"access_token":"test-access","refresh_token":"test-refresh","token_type":"Bearer","expires_in":3600}""".Replace("3600", expireToken ? "1" : "3600"));
        }
        if (request.RequestUri.AbsoluteUri == "https://api.spotify.com/v1/me")
        {
            Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
            Assert.Equal("test-access", request.Headers.Authorization?.Parameter);
            return Json("""{"id":"test-user","display_name":"Test Listener"}""");
        }
        if (request.RequestUri.AbsolutePath == "/v1/search")
        {
            var query = QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.Equal("genre:rock year:1990-2026", query["q"].ToString());
            Assert.Equal("10", query["limit"].ToString());
            Assert.Equal("10", query["offset"].ToString());
            Assert.Equal("refreshed-access", request.Headers.Authorization?.Parameter);
            return Json("""{"tracks":{"next":"next-page","items":[{"id":"id","uri":"spotify:track:id","name":"Test Rock","duration_ms":123000,"artists":[{"name":"Artist"}],"album":{"images":[],"release_date":"1995"},"external_urls":{"spotify":"https://open.spotify.com/track/id"}}]}}""");
        }
        if (request.RequestUri.AbsolutePath == "/v1/me/player/play")
        {
            Assert.Equal(HttpMethod.Put, request.Method);
            Assert.Equal("test-device", QueryHelpers.ParseQuery(request.RequestUri.Query)["device_id"].ToString());
            var body = await request.Content!.ReadFromJsonAsync<JsonElement>(cancellationToken);
            Assert.Equal("spotify:track:0123456789012345678901", body.GetProperty("uris")[0].GetString());
            PlayCount++;
            return new HttpResponseMessage(HttpStatusCode.NoContent);
        }
        throw new InvalidOperationException("Unexpected outbound request: " + request.RequestUri);
    }

    private static HttpResponseMessage Json(string body) => new(HttpStatusCode.OK)
    { Content = new StringContent(body, Encoding.UTF8, "application/json") };
}
