using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence;

#nullable disable

namespace SmartFlightCompanion.WebServices.Infrastructure.src.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261116190000_EnsureAiExchangesUserIdColumn")]
    public sealed class EnsureAiExchangesUserIdColumn : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
                        migrationBuilder.Sql(@"
DO $$
BEGIN
        IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                    AND table_name = 'AIExchanges'
                    AND column_name = 'UserId') THEN
                ALTER TABLE ""AIExchanges"" ADD COLUMN ""UserId"" uuid NULL;
        END IF;
END $$;");

                        migrationBuilder.Sql(@"
CREATE INDEX IF NOT EXISTS ""IX_AIExchanges_UserId""
ON ""AIExchanges"" (""UserId"");");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_AIExchanges_UserId\";");
            migrationBuilder.Sql("ALTER TABLE \"AIExchanges\" DROP COLUMN IF EXISTS \"UserId\";");
        }
    }
}