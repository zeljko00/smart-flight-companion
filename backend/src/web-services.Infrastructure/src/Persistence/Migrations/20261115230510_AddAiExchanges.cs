using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFlightCompanion.WebServices.Infrastructure.src.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAiExchanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIExchanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Request = table.Column<string>(type: "text", nullable: false),
                    Response = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Timestamp = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIExchanges", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AIExchanges_Timestamp",
                table: "AIExchanges",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AIExchanges_UserId",
                table: "AIExchanges",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIExchanges");
        }
    }
}
