using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using System.IO;
using Serilog;
using Serilog.Events;

using PaymentGateway.Api.Data;

var builder = WebApplication.CreateBuilder(args);

var paymentGatewayLogPath = Environment.GetEnvironmentVariable("LogFilePath")
    ?? "logs/payment-gateway-api-.log";

builder.Host.UseSerilog((context, services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .MinimumLevel.Information()
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning)
        .WriteTo.Console()
        .WriteTo.File(
            path: paymentGatewayLogPath,
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            shared: true);
});

// Add services to the container.

var paymentGatewayDb = Environment.GetEnvironmentVariable("ConnectionStrings__PaymentGatewayDb")
    ?? builder.Configuration.GetConnectionString("PaymentGatewayDb");

builder.Services.AddControllers(options =>
{
    options.Conventions.Insert(0, new GlobalRoutePrefixConvention("api"));
});
builder.Services.AddDbContext<PaymentGatewayDbContext>(options =>
    options.UseSqlite(paymentGatewayDb));
builder.Services.AddHttpClient();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PaymentGatewayDbContext>();
    dbContext.Database.EnsureCreated();

    var initScriptPath = Environment.GetEnvironmentVariable("PaymentGateway__InitSqlPath")
        ?? "/app/scripts/01_init_database.sql";

    if (File.Exists(initScriptPath))
    {
        var initScript = File.ReadAllText(initScriptPath);

        if (!string.IsNullOrWhiteSpace(initScript))
        {
            dbContext.Database.ExecuteSqlRaw(initScript);
        }
    }
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "PaymentGateway API terminated unexpectedly.");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

internal sealed class GlobalRoutePrefixConvention(string prefix) : IApplicationModelConvention
{
    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            foreach (var selector in controller.Selectors)
            {
                if (selector.AttributeRouteModel is null)
                {
                    continue;
                }

                selector.AttributeRouteModel = AttributeRouteModel.CombineAttributeRouteModel(
                    new AttributeRouteModel { Template = prefix },
                    selector.AttributeRouteModel);
            }
        }
    }
}
