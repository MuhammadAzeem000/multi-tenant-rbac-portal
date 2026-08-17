import { prisma } from "../config/prisma";
import * as platformAuthService from "./platformAuth.service";
import * as tenantService from "./tenant.service";
import * as userService from "./user.service";
import { UserResponse } from "../interfaces/user";
import { TenantResponse } from "../interfaces/tenant";

const MODULES = [
  { name: "Tenants", sortOrder: 0 },
  { name: "Users", sortOrder: 1 },
  { name: "Departments", sortOrder: 2 },
  { name: "Roles", sortOrder: 3 },
  { name: "Modules", sortOrder: 4 },
  { name: "Actions", sortOrder: 5 },
  { name: "Permissions", sortOrder: 6 },
] as const;

const ACTIONS = [
  { name: "View", sortOrder: 0 },
  { name: "Create", sortOrder: 1 },
  { name: "Update", sortOrder: 2 },
  { name: "Delete", sortOrder: 3 },
] as const;

export interface ProvisionTenantInput {
  tenantName: string;
  tenantDomain: string;
  adminName: string;
  adminEmailLocalPart: string;
  adminPassword: string;
}

export interface ProvisionTenantResult {
  tenant: TenantResponse;
  user: UserResponse;
}

export interface ProvisionAdminInput {
  tenantId: bigint;
  adminName: string;
  adminEmailLocalPart: string;
  adminPassword: string;
}

// Modules/Actions are global and shared across tenants — Module/Action have no
// unique key besides id, so re-runs find-or-create by name instead of upserting.
async function findOrCreateModule(input: { name: string; sortOrder: number }) {
  const existing = await prisma.module.findFirst({ where: { name: input.name, deletedAt: null } });
  if (existing) return existing;
  return prisma.module.create({ data: { ...input, isSystem: true } });
}

async function findOrCreateAction(input: { name: string; sortOrder: number }) {
  const existing = await prisma.action.findFirst({ where: { name: input.name, deletedAt: null } });
  if (existing) return existing;
  return prisma.action.create({ data: input });
}

/**
 * Creates a brand-new tenant with a fully-provisioned "Administrator" role
 * (every module x action permission) and its first user assigned to that role.
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  const modules = await Promise.all(MODULES.map(findOrCreateModule));
  const actions = await Promise.all(ACTIONS.map(findOrCreateAction));

  // A publicly self-registered tenant always becomes a direct child of the
  // platform tenant — the *other* way to create a tenant (POST /tenants, an
  // authenticated admin acting within their own tenant) is what lets a
  // reseller create children under itself instead.
  const platformTenantId = await platformAuthService.getPlatformTenantId();
  const tenant = await tenantService.createTenant(
    {
      name: input.tenantName,
      domain: input.tenantDomain,
    },
    platformTenantId,
  );

  const permissions = await Promise.all(
    modules.flatMap((module) =>
      actions.map((action) =>
        prisma.permission.create({
          data: {
            tenantId: tenant.id,
            moduleId: module.id,
            actionId: action.id,
            name: `${action.name} ${module.name}`,
          },
        }),
      ),
    ),
  );

  const role = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "Administrator",
      description: "Full access to every module and action.",
      isSystem: true,
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
    emailLocalPart: input.adminEmailLocalPart,
    password: input.adminPassword,
  });

  await prisma.userRole.create({
    data: { tenantId: tenant.id, userId: user.id, roleId: role.id },
  });

  return { tenant, user };
}

/**
 * Gives an already-created tenant its first user, with an "Administrator"
 * role covering every module the tenant currently has enabled — not a fixed
 * list, since a tenant created under a parent (POST /tenants) only ever has
 * whatever the parent-cascade granted it (see tenantModule.service).
 *
 * Used for tenants created by an existing admin (as opposed to public
 * self-registration, which provisions its own curated module set via
 * provisionTenant above).
 */
export async function provisionAdminForTenant(input: ProvisionAdminInput): Promise<UserResponse> {
  const actions = await Promise.all(ACTIONS.map(findOrCreateAction));

  const enabledModules = await prisma.tenantModule.findMany({
    where: { tenantId: input.tenantId, isEnabled: true },
    select: { module: { select: { id: true, name: true } } },
  });

  const permissions = await Promise.all(
    enabledModules.flatMap(({ module }) =>
      actions.map((action) =>
        prisma.permission.create({
          data: {
            tenantId: input.tenantId,
            moduleId: module.id,
            actionId: action.id,
            name: `${action.name} ${module.name}`,
          },
        }),
      ),
    ),
  );

  const role = await prisma.role.create({
    data: {
      tenantId: input.tenantId,
      name: "Administrator",
      description: "Full access to every module and action.",
      isSystem: true,
    },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      tenantId: input.tenantId,
      roleId: role.id,
      permissionId: permission.id,
    })),
  });

  const user = await userService.createUser({
    tenantId: input.tenantId,
    name: input.adminName,
    emailLocalPart: input.adminEmailLocalPart,
    password: input.adminPassword,
  });

  await prisma.userRole.create({
    data: { tenantId: input.tenantId, userId: user.id, roleId: role.id },
  });

  return user;
}
