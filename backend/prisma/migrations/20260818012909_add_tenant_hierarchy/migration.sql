-- DropIndex
DROP INDEX "actions_code_key";

-- DropIndex
DROP INDEX "departments_tenant_id_code_key";

-- DropIndex
DROP INDEX "modules_code_key";

-- DropIndex
DROP INDEX "modules_is_platform_only_idx";

-- DropIndex
DROP INDEX "permissions_tenant_id_code_key";

-- DropIndex
DROP INDEX "roles_tenant_id_code_key";

-- DropIndex
DROP INDEX "tenants_code_key";

-- DropIndex
DROP INDEX "tenants_slug_key";

-- DropIndex
DROP INDEX "users_tenant_id_employee_code_key";

-- DropIndex
DROP INDEX "users_tenant_id_username_key";

-- AlterTable
ALTER TABLE "actions" DROP COLUMN "code",
DROP COLUMN "is_system";

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "code";

-- AlterTable
ALTER TABLE "modules" DROP COLUMN "code",
DROP COLUMN "is_platform_only";

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "code",
DROP COLUMN "is_system";

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "code",
DROP COLUMN "is_default",
DROP COLUMN "priority";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "code",
DROP COLUMN "currency",
DROP COLUMN "email",
DROP COLUMN "locale",
DROP COLUMN "logo_url",
DROP COLUMN "phone",
DROP COLUMN "slug",
DROP COLUMN "timezone",
DROP COLUMN "website_url";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verified_at",
DROP COLUMN "employee_code",
DROP COLUMN "is_verified",
DROP COLUMN "job_title",
DROP COLUMN "locale",
DROP COLUMN "phone",
DROP COLUMN "phone_verified_at",
DROP COLUMN "timezone",
DROP COLUMN "username";

