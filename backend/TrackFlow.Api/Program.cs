using TrackFlow.Api.Auth;
using TrackFlow.Api.Configuration;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls(LocalDevelopment.BackendUrl);
builder.Services.AddOpenApi();
builder.Services.AddTrackFlowAuthentication(builder.Configuration, builder.Environment);

var app = builder.Build();
app.UseLocalAuthRequestPolicy();
app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapAuthEndpoints();
app.Run();

// Expose the entry point to the integration test host.
public partial class Program { }
