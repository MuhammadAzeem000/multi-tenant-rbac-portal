import { prisma } from "../config/prisma";
import { TenantModuleResponse } from "../interfaces/tenantModule";

// Bounded, small set (every active module) — not paginated like the rest of
// the API, since this is "every module and its entitlement status", not a
// filterable collection.
export async function getModulesForTenant(tenantId: bigint): Promise<TenantModuleResponse[]> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { parentTenantId: true },
  });
  // null means "no parent to cap this tenant" (the platform tenant) — every
  // module counts as available in that case, so we never build the set.
  const parentEnabledModuleIds =
    tenant.parentTenantId === null
      ? null
      : new Set(
          (
            await prisma.tenantModule.findMany({
              where: { tenantId: tenant.parentTenantId, isEnabled: true },
              select: { moduleId: true },
            })
          ).map((entitlement) => entitlement.moduleId),
        );

  const modules = await prisma.module.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      sortOrder: true,
      tenantModules: {
        where: { tenantId },
        select: { isEnabled: true, enabledAt: true, disabledAt: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return modules.map((module) => {
    const entitlement = module.tenantModules[0];
    return {
      moduleId: module.id,
      name: module.name,
      description: module.description,
      icon: module.icon,
      sortOrder: module.sortOrder,
      isEnabled: entitlement?.isEnabled ?? false,
      enabledAt: entitlement?.enabledAt ?? null,
      disabledAt: entitlement?.disabledAt ?? null,
      availableToParent: parentEnabledModuleIds === null || parentEnabledModuleIds.has(module.id),
    };
  });
}

// Grants a newly created tenant access to whatever its parent currently has
// enabled — a child can never start with more than its parent. The platform
// tenant (parentTenantId null) has nothing to inherit from, so it gets every
// active module instead. skipDuplicates keeps this safe to call more than
// once for the same tenant.
export async function grantInheritedModuleAccess(
  tenantId: bigint,
  parentTenantId: bigint | null,
  actorUserId?: bigint,
): Promise<void> {
  const moduleIds =
    parentTenantId === null
      ? (
          await prisma.module.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true },
          })
        ).map((module) => module.id)
      : (
          await prisma.tenantModule.findMany({
            where: { tenantId: parentTenantId, isEnabled: true },
            select: { moduleId: true },
          })
        ).map((entitlement) => entitlement.moduleId);

  if (moduleIds.length === 0) return;

  const now = new Date();
  await prisma.tenantModule.createMany({
    data: moduleIds.map((moduleId) => ({
      tenantId,
      moduleId,
      isEnabled: true,
      enabledAt: now,
      createdBy: actorUserId,
    })),
    skipDuplicates: true,
  });
}

export async function isModuleEnabledForTenant(tenantId: bigint, moduleId: bigint): Promise<boolean> {
  const entitlement = await prisma.tenantModule.findUnique({
    where: { tenantId_moduleId: { tenantId, moduleId } },
    select: { isEnabled: true },
  });
  return entitlement?.isEnabled ?? false;
}

// A tenant may only have a module enabled if its own parent currently has
// that module enabled too — the platform tenant (no parent) is unrestricted.
// This is the enforcement side of the same cap grantInheritedModuleAccess
// applies at creation time.
export async function isModuleAvailableToParent(tenantId: bigint, moduleId: bigint): Promise<boolean> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { parentTenantId: true },
  });
  if (tenant.parentTenantId === null) return true;

  return isModuleEnabledForTenant(tenant.parentTenantId, moduleId);
}

export async function setModuleEnabled(
  tenantId: bigint,
  moduleId: bigint,
  isEnabled: boolean,
  actorUserId: bigint,
): Promise<TenantModuleResponse> {
  const now = new Date();
  const [entitlement, availableToParent] = await Promise.all([
    prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      create: {
        tenantId,
        moduleId,
        isEnabled,
        enabledAt: now,
        disabledAt: isEnabled ? null : now,
        createdBy: actorUserId,
      },
      update: isEnabled ? { isEnabled, enabledAt: now, disabledAt: null } : { isEnabled, disabledAt: now },
      include: {
        module: {
          select: { name: true, description: true, icon: true, sortOrder: true },
        },
      },
    }),
    isModuleAvailableToParent(tenantId, moduleId),
  ]);

  return {
    moduleId: entitlement.moduleId,
    name: entitlement.module.name,
    description: entitlement.module.description,
    icon: entitlement.module.icon,
    sortOrder: entitlement.module.sortOrder,
    isEnabled: entitlement.isEnabled,
    enabledAt: entitlement.enabledAt,
    disabledAt: entitlement.disabledAt,
    availableToParent,
  };
}
