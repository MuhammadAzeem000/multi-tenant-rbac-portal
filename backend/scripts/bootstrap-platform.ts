/**
 * Idempotent script that provisions the Platform tenant: its two
 * platform-only modules (Tenant Management, Audit Logs), the permissions for
 * them, a "Platform Administrator" role holding all of them, and the first
 * platform admin user assigned to that role.
 *
 * Safe to run more than once against the same database — every step
 * find-or-creates rather than assuming a clean slate, so re-running never
 * produces duplicate tenants, roles, permissions, or users. Re-running with
 * the same admin username after it already exists simply skips user
 * creation and reports the rest as already in place.
 *
 *   npx tsx scripts/bootstrap-platform.ts \
 *     --name "Alice Admin" --username alice --email alice --password "Secret123!"
 *
 * Optional overrides: --tenant-name, --tenant-slug, --tenant-domain
 * (default to "Platform" / "platform" / "platform.internal").
 *
 * Adding a *second* platform admin later needs no script — create the user
 * under the Platform tenant and assign a role via the normal Users/Roles UI,
 * same as any other tenant.
 */
import { prisma } from "../src/config/prisma";
import * as tenantService from "../src/services/tenant.service";
import * as tenantModuleService from "../src/services/tenantModule.service";
import * as userService from "../src/services/user.service";

const PLATFORM_ACTIONS = [
  { name: "View", code: "view", sortOrder: 0 },
  { name: "Create", code: "create", sortOrder: 1 },
  { name: "Update", code: "update", sortOrder: 2 },
  { name: "Delete", code: "delete", sortOrder: 3 },
] as const;

const PLATFORM_MODULES = [
  { name: "Dashboard", code: "platform_dashboard", sortOrder: 0, },
  { name: "Tenants", code: "platform_tenants", sortOrder: 1 },
  { name: "Users", code: "platform_users", sortOrder: 2 },
  { name: "Departments", code: "platform_departments", sortOrder: 3 },
  { name: "Roles", code: "platform_roles", sortOrder: 4 },
  { name: "Modules", code: "platform_modules", sortOrder: 5 },
  { name: "Actions", code: "platform_actions", sortOrder: 6 },
  { name: "Permissions", code: "platform_permissions", sortOrder: 7 },
] as const;

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const adminName = args.name;
  const adminUsername = args.username;
  const adminEmailLocalPart = args.email;
  const adminPassword = args.password;
  const tenantName = args["tenant-name"] ?? "Platform";
  const tenantSlug = args["tenant-slug"] ?? "platform";
  const tenantDomain = args["tenant-domain"] ?? "platform.internal";

  if (!adminName || !adminUsername || !adminEmailLocalPart || !adminPassword) {
    console.error(
      "Usage: npx tsx scripts/bootstrap-platform.ts --name <name> --username <username> --email <local-part> --password <password>",
    );
    process.exitCode = 1;
    return;
  }

  // Global taxonomy — safe to upsert by code regardless of whether this is a
  // fresh install or a re-run.
  const actions = await Promise.all(
    PLATFORM_ACTIONS.map((action) =>
      prisma.action.upsert({ where: { code: action.code }, update: {}, create: { ...action, isSystem: true } }),
    ),
  );
  const modules = await Promise.all(
    PLATFORM_MODULES.map((module) =>
      prisma.module.upsert({
        where: { code: module.code },
        update: { name: module.name, sortOrder: module.sortOrder, isPlatformOnly: true },
        create: { ...module, isSystem: true, isPlatformOnly: true },
      }),
    ),
  );

  let tenant = await prisma.tenant.findFirst({ where: { isPlatform: true }, select: { id: true, slug: true } });
  if (tenant) {
    console.log(`Platform tenant already exists (id ${tenant.id}, slug "${tenant.slug}") — reusing it.`);
  } else {
    const created = await tenantService.createTenant({ name: tenantName, slug: tenantSlug, domain: tenantDomain });
    await prisma.tenant.update({ where: { id: created.id }, data: { isPlatform: true } });
    tenant = { id: created.id, slug: created.slug };
    console.log(`Created platform tenant (id ${tenant.id}, slug "${tenant.slug}").`);
  }

  // Permissions are unique per (tenantId, code) — upsert so re-running never
  // hits a duplicate-key error.
  const permissions = await Promise.all(
    modules.flatMap((module) =>
      actions.map((action) => {
        const code = `${module.code}.${action.code}`;
        const name = `${action.name} ${module.name}`;
        return prisma.permission.upsert({
          where: { tenantId_code: { tenantId: tenant!.id, code } },
          update: { name },
          create: {
            tenantId: tenant!.id,
            moduleId: module.id,
            actionId: action.id,
            name,
            code,
            isSystem: true,
          },
        });
      }),
    ),
  );

  const role = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "platform_admin" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Platform Administrator",
      code: "platform_admin",
      description: "Full access to every platform module and action.",
      isSystem: true,
      priority: 1000,
    },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      tenantId: tenant!.id,
      roleId: role.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  // The platform tenant's own module entitlements — its 2 platform-only
  // modules, granted directly (grantStandardModuleAccess deliberately
  // excludes platform-only modules, so it doesn't cover this case).
  await Promise.all(
    modules.map((module) =>
      prisma.tenantModule.upsert({
        where: { tenantId_moduleId: { tenantId: tenant!.id, moduleId: module.id } },
        update: {},
        create: { tenantId: tenant!.id, moduleId: module.id, isEnabled: true },
      }),
    ),
  );
  // Standard modules too, so platform staff can manage their own users/roles/etc.
  await tenantModuleService.grantStandardModuleAccess(tenant.id);

  const existingUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, username: adminUsername, deletedAt: null },
    select: { id: true },
  });

  let userId: bigint;
  if (existingUser) {
    console.log(`Admin user "${adminUsername}" already exists (id ${existingUser.id}) — skipping user creation.`);
    userId = existingUser.id;
  } else {
    const user = await userService.createUser({
      tenantId: tenant.id,
      name: adminName,
      username: adminUsername,
      emailLocalPart: adminEmailLocalPart,
      password: adminPassword,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, emailVerifiedAt: new Date() },
    });
    userId = user.id;
    console.log(`Created admin user "${adminUsername}" (id ${userId}).`);
  }

  await prisma.userRole.upsert({
    where: { tenantId_userId_roleId: { tenantId: tenant.id, userId, roleId: role.id } },
    update: {},
    create: { tenantId: tenant.id, userId, roleId: role.id },
  });

  console.log("Platform tenant bootstrap complete.");
  console.log(`  Tenant slug: ${tenant.slug}`);
  console.log(`  Admin username: ${adminUsername}`);
  console.log(`  Log in with tenantSlug="${tenant.slug}", identifier="${adminUsername}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
