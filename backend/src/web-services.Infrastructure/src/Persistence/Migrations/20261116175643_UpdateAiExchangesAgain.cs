using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFlightCompanion.WebServices.Infrastructure.src.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAiExchangesAgain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FlightId",
                table: "AIExchanges",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FlightId",
                table: "AIExchanges");
        }
    }
}
