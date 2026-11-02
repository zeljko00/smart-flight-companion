using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartFlightCompanion.WebServices.Infrastructure.Mail;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

namespace SmartFlightCompanion.WebServices.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IAirportRepository, AirportRepository>();
        services.AddScoped<IFlightRepository, FlightRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICommentRepository, CommentRepository>();
        services.AddScoped<IBoardingPassRepository, BoardingPassRepository>();
        services.AddScoped<IRequestLogRepository, RequestLogRepository>();
        services.AddScoped<IBoardingGuideRepository, BoardingGuideRepository>();
        services.AddScoped<IMediaRepository, MediaRepository>();

        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.AddSingleton<InMemoryEmailQueue>();
        services.AddSingleton<IEmailQueue>(provider => provider.GetRequiredService<InMemoryEmailQueue>());
        services.AddSingleton<IEmailQueueReader>(provider => provider.GetRequiredService<InMemoryEmailQueue>());
        services.AddHostedService<MailWorker>();

        return services;
    }
}