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

export async function isPlatformTenant(tenantId: bigint): Promise<boolean> {
  const platformTenantId = await getPlatformTenantId();
  return platformTenantId !== null && platformTenantId === tenantId;
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
