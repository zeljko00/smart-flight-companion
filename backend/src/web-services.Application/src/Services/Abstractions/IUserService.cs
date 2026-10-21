using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IUserService
{
    Task<UserDto?> Login(UserLoginRequestDto request, CancellationToken cancellationToken = default);
    Task<UserDto?> Register(UserRegisterRequestDto request, CancellationToken cancellationToken = default);
}