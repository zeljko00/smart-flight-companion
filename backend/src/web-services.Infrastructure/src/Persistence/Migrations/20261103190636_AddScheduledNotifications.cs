using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduledNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScheduledNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    ScheduledForUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsSent = table.Column<bool>(type: "boolean", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    RelatedFlightId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledNotifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledNotifications_RelatedFlightId_Category_IsSent_IsCa~",
                table: "ScheduledNotifications",
                columns: new[] { "RelatedFlightId", "Category", "IsSent", "IsCancelled" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledNotifications_ScheduledForUtc_IsSent_IsCancelled",
                table: "ScheduledNotifications",
                columns: new[] { "ScheduledForUtc", "IsSent", "IsCancelled" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScheduledNotifications");
        }
    }
}
