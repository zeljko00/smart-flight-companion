using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AlignScheduledNotificationsTypeSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ScheduledNotifications_RelatedFlightId_Category_IsSent_IsCa~",
                table: "ScheduledNotifications");

            migrationBuilder.DropIndex(
                name: "IX_ScheduledNotifications_ScheduledForUtc_IsSent_IsCancelled",
                table: "ScheduledNotifications");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "ScheduledNotifications");

            migrationBuilder.DropColumn(
                name: "IsCancelled",
                table: "ScheduledNotifications");

            migrationBuilder.DropColumn(
                name: "IsSent",
                table: "ScheduledNotifications");

            migrationBuilder.DropColumn(
                name: "RelatedFlightId",
                table: "ScheduledNotifications");

            migrationBuilder.DropColumn(
                name: "SentAtUtc",
                table: "ScheduledNotifications");

            migrationBuilder.DropColumn(
                name: "TargetType",
                table: "ScheduledNotifications");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "ScheduledNotifications",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledNotifications_TargetId_Type_ScheduledForUtc",
                table: "ScheduledNotifications",
                columns: new[] { "TargetId", "Type", "ScheduledForUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ScheduledNotifications_TargetId_Type_ScheduledForUtc",
                table: "ScheduledNotifications");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "ScheduledNotifications");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ScheduledNotifications",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsCancelled",
                table: "ScheduledNotifications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSent",
                table: "ScheduledNotifications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "RelatedFlightId",
                table: "ScheduledNotifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SentAtUtc",
                table: "ScheduledNotifications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetType",
                table: "ScheduledNotifications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledNotifications_RelatedFlightId_Category_IsSent_IsCa~",
                table: "ScheduledNotifications",
                columns: new[] { "RelatedFlightId", "Category", "IsSent", "IsCancelled" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledNotifications_ScheduledForUtc_IsSent_IsCancelled",
                table: "ScheduledNotifications",
                columns: new[] { "ScheduledForUtc", "IsSent", "IsCancelled" });
        }
    }
}
