/**
 * Idempotent script that provisions the Platform tenant: the global
 * module/action taxonomy, the permissions for every module x action, a
 * "Platform Administrator" role holding all of them, and the first platform
 * admin user assigned to that role.
 *
 * Safe to run more than once against the same database — every step
 * find-or-creates rather than assuming a clean slate, so re-running never
 * produces duplicate tenants, roles, permissions, or users. Re-running with
 * the same admin email after it already exists simply skips user creation
 * and reports the rest as already in place.
 *
 *   npx tsx scripts/bootstrap-platform.ts \
 *     --name "Alice Admin" --email alice --password "Secret123!"
 *
 * Optional overrides: --tenant-name, --tenant-domain (default to "Platform" /
 * "platform.internal").
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
  { name: "View", sortOrder: 0 },
  { name: "Create", sortOrder: 1 },
  { name: "Update", sortOrder: 2 },
  { name: "Delete", sortOrder: 3 },
] as const;

const PLATFORM_MODULES = [
  { name: "Dashboard", sortOrder: 0 },
  { name: "Tenants", sortOrder: 1 },
  { name: "Users", sortOrder: 2 },
  { name: "Departments", sortOrder: 3 },
  { name: "Roles", sortOrder: 4 },
  { name: "Modules", sortOrder: 5 },
  { name: "Actions", sortOrder: 6 },
  { name: "Permissions", sortOrder: 7 },
  { name: "Audit Logs", sortOrder: 8 },
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

// Modules/Actions are global and shared across tenants — Module/Action have no
// unique key besides id, so re-runs find-or-create by name instead of upserting.
async function findOrCreateAction(input: { name: string; sortOrder: number }) {
  const existing = await prisma.action.findFirst({ where: { name: input.name, deletedAt: null } });
  if (existing) return existing;
  return prisma.action.create({ data: input });
}

async function findOrCreateModule(input: { name: string; sortOrder: number }) {
  const existing = await prisma.module.findFirst({ where: { name: input.name, deletedAt: null } });
  if (existing) return existing;
  return prisma.module.create({ data: { ...input, isSystem: true } });
}

async function main() {
  const args = parseArgs();
  const adminName = args.name;
  const adminEmailLocalPart = args.email;
  const adminPassword = args.password;
  const tenantName = args["tenant-name"] ?? "Platform";
  const tenantDomain = args["tenant-domain"] ?? "platform.internal";

  if (!adminName || !adminEmailLocalPart || !adminPassword) {
    console.error(
      "Usage: npx tsx scripts/bootstrap-platform.ts --name <name> --email <local-part> --password <password>",
    );
    process.exitCode = 1;
    return;
  }

  // Global taxonomy — safe to run more than once regardless of whether this
  // is a fresh install or a re-run.
  const actions = await Promise.all(PLATFORM_ACTIONS.map(findOrCreateAction));
  const modules = await Promise.all(PLATFORM_MODULES.map(findOrCreateModule));

  let tenant = await prisma.tenant.findFirst({ where: { isPlatform: true }, select: { id: true, domain: true } });
  if (tenant) {
    console.log(`Platform tenant already exists (id ${tenant.id}, domain "${tenant.domain}") — reusing it.`);
  } else {
    const created = await tenantService.createTenant({ name: tenantName, domain: tenantDomain }, null);
    await prisma.tenant.update({ where: { id: created.id }, data: { isPlatform: true } });
    tenant = { id: created.id, domain: tenantDomain };
    console.log(`Created platform tenant (id ${tenant.id}, domain "${tenant.domain}").`);
  }

  // Permissions are unique per (tenantId, moduleId, actionId) — upsert so
  // re-running never hits a duplicate-key error.
  const permissions = await Promise.all(
    modules.flatMap((module) =>
      actions.map((action) => {
        const name = `${action.name} ${module.name}`;
        return prisma.permission.upsert({
          where: { tenantId_moduleId_actionId: { tenantId: tenant!.id, moduleId: module.id, actionId: action.id } },
          update: { name },
          create: { tenantId: tenant!.id, moduleId: module.id, actionId: action.id, name },
        });
      }),
    ),
  );

  const role = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Platform Administrator" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Platform Administrator",
      description: "Full access to every platform module and action.",
      isSystem: true,
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

  // Every module, so platform staff can manage tenants/users/roles/etc. and
  // review audit logs. The platform tenant has no parent to cap it, so this
  // grants everything active. Safe to call on every run — skipDuplicates
  // keeps it a no-op once granted, and it also tops up any module added
  // since the last run.
  await tenantModuleService.grantInheritedModuleAccess(tenant.id, null);

  const email = `${adminEmailLocalPart}@${tenant.domain}`;
  const existingUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email, deletedAt: null },
    select: { id: true },
  });

  let userId: bigint;
  if (existingUser) {
    console.log(`Admin user "${email}" already exists (id ${existingUser.id}) — skipping user creation.`);
    userId = existingUser.id;
  } else {
    const user = await userService.createUser({
      tenantId: tenant.id,
      name: adminName,
      emailLocalPart: adminEmailLocalPart,
      password: adminPassword,
    });
    userId = user.id;
    console.log(`Created admin user "${email}" (id ${userId}).`);
  }

  await prisma.userRole.upsert({
    where: { tenantId_userId_roleId: { tenantId: tenant.id, userId, roleId: role.id } },
    update: {},
    create: { tenantId: tenant.id, userId, roleId: role.id },
  });

  console.log("Platform tenant bootstrap complete.");
  console.log(`  Tenant domain: ${tenant.domain}`);
  console.log(`  Log in with tenantDomain="${tenant.domain}", email="${email}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
