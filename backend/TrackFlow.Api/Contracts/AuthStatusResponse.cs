namespace TrackFlow.Api.Contracts;

internal sealed record AuthStatusResponse(
    bool Configured, bool Authenticated, string? DisplayName, string? CsrfToken);
