import { prisma } from "../config/prisma";

export const PLATFORM_MODULES = {
  TENANTS: "Tenants",
  AUDIT_LOGS: "Audit Logs",
} as const;

// The platform tenant is a fixed singleton once bootstrapped — safe to cache
// for the life of the process. Never cache a "not found" result, so a server
// started before bootstrap still picks it up on the next request afterward.
let cachedPlatformTenantId: bigint | null = null;

/** Test-only: clears the in-memory cache so mocked lookups aren't stale across test cases. */
export function __resetPlatformTenantCache(): void {
  cachedPlatformTenantId = null;
}

export async function getPlatformTenantId(): Promise<bigint | null> {
  if (cachedPlatformTenantId !== null) return cachedPlatformTenantId;

  const tenant = await prisma.tenant.findFirst({
    where: { isPlatform: true, deletedAt: null },
    select: { id: true },
  });
  if (tenant) cachedPlatformTenantId = tenant.id;
  return tenant?.id ?? null;
}

export async function userHasPermission(
  userId: bigint,
  moduleName: string,
  actionName: string,
): Promise<boolean> {
  const count = await prisma.userRole.count({
    where: {
      userId,
      role: {
        isActive: true,
        deletedAt: null,
        rolePermissions: {
          some: {
            permission: {
              isActive: true,
              deletedAt: null,
              module: { name: moduleName },
              action: { name: actionName },
            },
          },
        },
      },
    },
  });
  return count > 0;
}

// Whether tenantId currently has moduleName enabled via its TenantModule
// entitlement — independent of who is asking or which role they hold.
export async function tenantCanUseModule(tenantId: bigint, moduleName: string): Promise<boolean> {
  const count = await prisma.tenantModule.count({
    where: {
      tenantId,
      isEnabled: true,
      module: { name: moduleName, isActive: true, deletedAt: null },
    },
  });
  return count > 0;
}

// The full gate for a module action: the acting user's own tenant must have
// the module enabled AND the user's role must grant the specific action on
// it. Deliberately not scoped to the platform tenant — any tenant (platform,
// reseller, or leaf) that has been granted a module can act on it for
// itself; reaching into a *different* tenant is authorized separately via
// the tenant hierarchy (see tenant.service.isAncestorOf).
export async function hasModulePermission(
  tenantId: bigint,
  userId: bigint,
  moduleName: string,
  actionName: string,
): Promise<boolean> {
  if (!(await tenantCanUseModule(tenantId, moduleName))) return false;
  return userHasPermission(userId, moduleName, actionName);
}
