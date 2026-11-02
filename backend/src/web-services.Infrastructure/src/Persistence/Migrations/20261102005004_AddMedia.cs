using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFlightCompanion.WebServices.Infrastructure.src.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMedia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VideoUrl",
                table: "BoardingGuides");

            migrationBuilder.CreateTable(
                name: "Media",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BoardingGuideId = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Media", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Media_BoardingGuides_BoardingGuideId",
                        column: x => x.BoardingGuideId,
                        principalTable: "BoardingGuides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Media_BoardingGuideId",
                table: "Media",
                column: "BoardingGuideId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Media");

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                table: "BoardingGuides",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
