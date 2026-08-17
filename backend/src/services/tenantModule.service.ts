import { prisma } from "../config/prisma";
import { TenantModuleResponse } from "../interfaces/tenantModule";

// Bounded, small set (every active module) — not paginated like the rest of
// the API, since this is "every module and its entitlement status", not a
// filterable collection.
export async function getModulesForTenant(tenantId: bigint): Promise<TenantModuleResponse[]> {
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
    };
  });
}

// Grants every active module to a newly created tenant. skipDuplicates keeps
// this safe to call more than once for the same tenant.
export async function grantStandardModuleAccess(tenantId: bigint, actorUserId?: bigint): Promise<void> {
  const modules = await prisma.module.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (modules.length === 0) return;

  const now = new Date();
  await prisma.tenantModule.createMany({
    data: modules.map((module) => ({
      tenantId,
      moduleId: module.id,
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

export async function setModuleEnabled(
  tenantId: bigint,
  moduleId: bigint,
  isEnabled: boolean,
  actorUserId: bigint,
): Promise<TenantModuleResponse> {
  const now = new Date();
  const entitlement = await prisma.tenantModule.upsert({
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
  });

  return {
    moduleId: entitlement.moduleId,
    name: entitlement.module.name,
    description: entitlement.module.description,
    icon: entitlement.module.icon,
    sortOrder: entitlement.module.sortOrder,
    isEnabled: entitlement.isEnabled,
    enabledAt: entitlement.enabledAt,
    disabledAt: entitlement.disabledAt,
  };
}
