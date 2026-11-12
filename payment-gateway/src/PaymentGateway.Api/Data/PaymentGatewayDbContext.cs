using Microsoft.EntityFrameworkCore;
using PaymentGateway.Api.Models;

namespace PaymentGateway.Api.Data;

public sealed class PaymentGatewayDbContext(DbContextOptions<PaymentGatewayDbContext> options) : DbContext(options)
{
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<CreditCard> CreditCards => Set<CreditCard>();
    public DbSet<Payment> Payments => Set<Payment>();
}
