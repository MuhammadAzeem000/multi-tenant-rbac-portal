import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";
import { CreateTenantInput, TenantResponse, UpdateTenantInput } from "../interfaces/tenant";
import * as tenantModuleService from "./tenantModule.service";

const tenantSelect = {
  id: true,
  name: true,
  domain: true,
  description: true,
  status: true,
  isActive: true,
  isPlatform: true,
  parentTenantId: true,
  settings: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getTenants(params: {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  // Restricts results to this set of ids (the caller's own tenant plus its
  // descendants) — callers always pass this so a tenant's "Tenants" screen
  // only ever shows its own subtree, never siblings or ancestors.
  visibleTenantIds: bigint[];
}): Promise<PaginatedResult<TenantResponse>> {
  const where: Prisma.TenantWhereInput = {
    deletedAt: null,
    id: { in: params.visibleTenantIds },
    ...(params.isActive !== undefined && { isActive: params.isActive }),
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { domain: { contains: params.search, mode: "insensitive" } },
      ],
    }),
  };
  const { skip, take } = toSkipTake(params.page, params.pageSize);

  const [data, total] = await Promise.all([
    prisma.tenant.findMany({ where, select: tenantSelect, orderBy: { id: "asc" }, skip, take }),
    prisma.tenant.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, params.page, params.pageSize) };
}

export function getTenantById(id: bigint): Promise<TenantResponse | null> {
  return prisma.tenant.findFirst({ where: { id, deletedAt: null }, select: tenantSelect });
}

// parentTenantId is never client-supplied: the caller decides it (the
// creating admin's own tenant, or null for the one-time platform bootstrap).
// Admin fields live on CreateTenantInput for request validation, but this
// only ever creates the Tenant row itself — the caller provisions the admin
// user separately (see tenantProvisioning.provisionAdminForTenant).
export async function createTenant(
  input: Omit<CreateTenantInput, "adminName" | "adminEmailLocalPart" | "adminPassword">,
  parentTenantId: bigint | null,
): Promise<TenantResponse> {
  const tenant = await prisma.tenant.create({
    data: {
      ...input,
      parentTenantId,
      settings: input.settings as Prisma.InputJsonValue | undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    select: tenantSelect,
  });

  await tenantModuleService.grantInheritedModuleAccess(tenant.id, parentTenantId);

  return tenant;
}

export function updateTenant(id: bigint, input: UpdateTenantInput): Promise<TenantResponse> {
  return prisma.tenant.update({
    where: { id },
    data: {
      ...input,
      settings: input.settings as Prisma.InputJsonValue | undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    select: tenantSelect,
  });
}

export function setTenantStatus(id: bigint, isActive: boolean): Promise<TenantResponse> {
  return prisma.tenant.update({
    where: { id },
    data: { isActive, status: isActive ? "active" : "suspended" },
    select: tenantSelect,
  });
}

export async function tenantHasDependents(id: bigint): Promise<boolean> {
  const [userCount, roleCount, departmentCount, permissionCount, childTenantCount] = await Promise.all([
    prisma.user.count({ where: { tenantId: id, deletedAt: null } }),
    prisma.role.count({ where: { tenantId: id, deletedAt: null } }),
    prisma.department.count({ where: { tenantId: id, deletedAt: null } }),
    prisma.permission.count({ where: { tenantId: id, deletedAt: null } }),
    prisma.tenant.count({ where: { parentTenantId: id, deletedAt: null } }),
  ]);
  return userCount > 0 || roleCount > 0 || departmentCount > 0 || permissionCount > 0 || childTenantCount > 0;
}

export function deleteTenant(id: bigint): Promise<TenantResponse> {
  return prisma.tenant.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: tenantSelect,
  });
}

// Breadth-first walk down the tree — cheap in practice since a tenant's
// parentTenantId is set once at creation and never reassigned, so the tree
// can never cycle and depth stays bounded by how many creation "hops" ever
// happened. Includes tenantId itself.
export async function getDescendantTenantIds(tenantId: bigint): Promise<bigint[]> {
  const result = [tenantId];
  let frontier = [tenantId];

  while (frontier.length > 0) {
    const children = await prisma.tenant.findMany({
      where: { parentTenantId: { in: frontier }, deletedAt: null },
      select: { id: true },
    });
    if (children.length === 0) break;
    frontier = children.map((child) => child.id);
    result.push(...frontier);
  }

  return result;
}

// Whether ancestorId is tenantId itself or one of its ancestors — i.e.
// whether ancestorId has management reach over tenantId. Walks up the chain
// rather than down, since a single lineage is cheap to trace one row at a
// time regardless of how large the tree is elsewhere.
export async function isAncestorOf(ancestorId: bigint, tenantId: bigint): Promise<boolean> {
  let currentId: bigint | null = tenantId;

  // Bounded defensively — the chain cannot actually cycle (see above), this
  // just guards against ever looping forever if that invariant is violated.
  for (let i = 0; i < 1000 && currentId !== null; i += 1) {
    if (currentId === ancestorId) return true;
    const current: { parentTenantId: bigint | null } | null = await prisma.tenant.findUnique({
      where: { id: currentId },
      select: { parentTenantId: true },
    });
    currentId = current?.parentTenantId ?? null;
  }

  return false;
}
