using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Flight> Flights => Set<Flight>();
    public DbSet<Airport> Airports => Set<Airport>();
    public DbSet<BoardingGuide> BoardingGuides => Set<BoardingGuide>();
    public DbSet<BoardingPass> BoardingPasses => Set<BoardingPass>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<RequestLog> RequestLogs => Set<RequestLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.Username).IsUnique();
            entity.Property(user => user.Role)
                .HasConversion<string>()
                .HasMaxLength(20);
        });

        modelBuilder.Entity<Flight>(entity =>
        {
            entity.Property(flight => flight.Status)
                .HasConversion<string>()
                .HasMaxLength(20);
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.Property(comment => comment.Content)
                .HasMaxLength(2000);

            entity.HasOne(comment => comment.Author)
                .WithMany()
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(comment => comment.Flight)
                .WithMany()
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BoardingPass>(entity =>
        {
            entity.Property(boardingPass => boardingPass.Seat)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.HasOne(boardingPass => boardingPass.User)
                .WithMany()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(boardingPass => boardingPass.Flight)
                .WithMany()
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BoardingGuide>(entity =>
        {
            entity.HasOne(boardingGuide => boardingGuide.Flight)
                .WithMany()
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RequestLog>(entity =>
        {
            entity.Property(requestLog => requestLog.IpAddress).HasMaxLength(RequestLog.MaxIpAddressLength);
            entity.Property(requestLog => requestLog.HttpMethod).HasMaxLength(RequestLog.MaxMethodLength);
            entity.Property(requestLog => requestLog.Path).HasMaxLength(RequestLog.MaxPathLength);
            entity.HasIndex(requestLog => requestLog.ReceivedAt);
        });
    }
}