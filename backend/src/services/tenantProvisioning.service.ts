import { prisma } from "../config/prisma";
import * as tenantService from "../services/tenant.service";
import * as userService from "../services/user.service";
import { UserResponse } from "../interfaces/user";
import { TenantResponse } from "../interfaces/tenant";

const MODULES = [
  { name: "Tenants", code: "tenants", sortOrder: 0 },
  { name: "Users", code: "users", sortOrder: 1 },
  { name: "Departments", code: "departments", sortOrder: 2 },
  { name: "Roles", code: "roles", sortOrder: 3 },
  { name: "Modules", code: "modules", sortOrder: 4 },
  { name: "Actions", code: "actions", sortOrder: 5 },
  { name: "Permissions", code: "permissions", sortOrder: 6 },
] as const;

const ACTIONS = [
  { name: "View", code: "view", sortOrder: 0 },
  { name: "Create", code: "create", sortOrder: 1 },
  { name: "Update", code: "update", sortOrder: 2 },
  { name: "Delete", code: "delete", sortOrder: 3 },
] as const;

export interface ProvisionTenantInput {
  tenantName: string;
  tenantSlug: string;
  adminName: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
}

export interface ProvisionTenantResult {
  tenant: TenantResponse;
  user: UserResponse;
}

/**
 * Creates a brand-new tenant with a fully-provisioned "Administrator" role
 * (every module x action permission) and its first user assigned to that role.
 * Modules/Actions are global and shared across tenants, so they're upserted
 * by code rather than recreated for every tenant.
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  const modules = await Promise.all(
    MODULES.map((module) =>
      prisma.module.upsert({
        where: { code: module.code },
        update: {},
        create: { ...module, isSystem: true },
      }),
    ),
  );

  const actions = await Promise.all(
    ACTIONS.map((action) =>
      prisma.action.upsert({
        where: { code: action.code },
        update: {},
        create: { ...action, isSystem: true },
      }),
    ),
  );

  const tenant = await tenantService.createTenant({
    name: input.tenantName,
    slug: input.tenantSlug,
  });

  const permissions = await Promise.all(
    modules.flatMap((module) =>
      actions.map((action) =>
        prisma.permission.create({
          data: {
            tenantId: tenant.id,
            moduleId: module.id,
            actionId: action.id,
            name: `${action.name} ${module.name}`,
            code: `${module.code}.${action.code}`,
            isSystem: true,
          },
        }),
      ),
    ),
  );

  const role = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "Administrator",
      code: "admin",
      description: "Full access to every module and action.",
      isSystem: true,
      priority: 1000,
    },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      tenantId: tenant.id,
      roleId: role.id,
      permissionId: permission.id,
    })),
  });

  const user = await userService.createUser({
    tenantId: tenant.id,
    name: input.adminName,
    username: input.adminUsername,
    email: input.adminEmail,
    password: input.adminPassword,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, emailVerifiedAt: new Date() },
  });

  await prisma.userRole.create({
    data: { tenantId: tenant.id, userId: user.id, roleId: role.id },
  });

  return { tenant, user };
}
