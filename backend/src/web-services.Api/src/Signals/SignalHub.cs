using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartFlightCompanion.WebServices.Api.Signals;

[Authorize(Policy = "VerifiedUserOnly")]
public class SignalHub : Hub
{
	public Task JoinFlightGroup(Guid flightId)
	{
		return Groups.AddToGroupAsync(Context.ConnectionId, $"flight-{flightId}");
	}

	public Task LeaveFlightGroup(Guid flightId)
	{
		return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"flight-{flightId}");
	}

	public Task JoinUserGroup(Guid userId)
	{
		return Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
	}

	public Task LeaveUserGroup(Guid userId)
	{
		return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{userId}");
	}
}