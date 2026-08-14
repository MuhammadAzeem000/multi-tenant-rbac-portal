-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "is_platform_only" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "parent_tenant_id" BIGINT;

-- CreateIndex
CREATE INDEX "modules_is_platform_only_idx" ON "modules"("is_platform_only");

-- CreateIndex
CREATE INDEX "tenants_parent_tenant_id_idx" ON "tenants"("parent_tenant_id");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_parent_tenant_id_fkey" FOREIGN KEY ("parent_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
