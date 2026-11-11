using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IAuthenticationService
{
    Task<AuthenticationResultDto?> Login(UserLoginRequestDto request, CancellationToken cancellationToken = default);
    Task<AuthenticationResultDto?> Refresh(string refreshToken, CancellationToken cancellationToken = default);
}