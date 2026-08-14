import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";
import { CreateTenantInput, TenantResponse, UpdateTenantInput } from "../interfaces/tenant";
import * as platformAuthService from "./platformAuth.service";
import * as tenantModuleService from "./tenantModule.service";

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  code: true,
  domain: true,
  description: true,
  logoUrl: true,
  websiteUrl: true,
  email: true,
  phone: true,
  timezone: true,
  locale: true,
  currency: true,
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
}): Promise<PaginatedResult<TenantResponse>> {
  const where: Prisma.TenantWhereInput = {
    deletedAt: null,
    ...(params.isActive !== undefined && { isActive: params.isActive }),
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { slug: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
        { domain: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
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

export async function createTenant(input: CreateTenantInput): Promise<TenantResponse> {
  // Every tenant's parent is whichever tenant currently has isPlatform = true.
  // Before the platform tenant exists, this resolves to null — which is
  // exactly right for the tenant being created *as* the platform tenant.
  const parentTenantId = await platformAuthService.getPlatformTenantId();

  const tenant = await prisma.tenant.create({
    data: {
      ...input,
      parentTenantId,
      settings: input.settings as Prisma.InputJsonValue | undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    select: tenantSelect,
  });

  // A regular tenant (one with a parent) automatically gets every standard
  // module; platform-only modules are never included. The platform tenant
  // itself (parentTenantId === null here) is provisioned separately by the
  // bootstrap script, so it's skipped.
  if (parentTenantId !== null) {
    await tenantModuleService.grantStandardModuleAccess(tenant.id);
  }

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
  const [userCount, roleCount, departmentCount, permissionCount] = await Promise.all([
    prisma.user.count({ where: { tenantId: id, deletedAt: null } }),
    prisma.role.count({ where: { tenantId: id, deletedAt: null } }),
    prisma.department.count({ where: { tenantId: id, deletedAt: null } }),
    prisma.permission.count({ where: { tenantId: id, deletedAt: null } }),
  ]);
  return userCount > 0 || roleCount > 0 || departmentCount > 0 || permissionCount > 0;
}

export function deleteTenant(id: bigint): Promise<TenantResponse> {
  return prisma.tenant.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: tenantSelect,
  });
}
