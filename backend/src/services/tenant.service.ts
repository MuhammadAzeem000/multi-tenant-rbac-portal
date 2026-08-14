import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";
import { CreateTenantInput, TenantResponse, UpdateTenantInput } from "../interfaces/tenant";

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

export function createTenant(input: CreateTenantInput): Promise<TenantResponse> {
  return prisma.tenant.create({
    data: {
      ...input,
      settings: input.settings as Prisma.InputJsonValue | undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    select: tenantSelect,
  });
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

export function deleteTenant(id: bigint): Promise<TenantResponse> {
  return prisma.tenant.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: tenantSelect,
  });
}
