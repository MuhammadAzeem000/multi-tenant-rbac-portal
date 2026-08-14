-- AlterTable: add as nullable first so existing rows don't violate NOT NULL
ALTER TABLE "tenants" ADD COLUMN "domain" VARCHAR(255);

-- Backfill existing tenants with a placeholder domain derived from their slug.
-- These should be reviewed and updated to the organization's real domain.
UPDATE "tenants" SET "domain" = "slug" || '.local' WHERE "domain" IS NULL;

-- Now enforce NOT NULL + uniqueness for all future rows
ALTER TABLE "tenants" ALTER COLUMN "domain" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");
