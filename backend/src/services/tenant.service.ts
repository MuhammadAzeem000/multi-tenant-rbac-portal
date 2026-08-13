import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { CreateTenantInput, TenantResponse, UpdateTenantInput } from "../interfaces/tenant";

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  code: true,
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

export function getTenants(): Promise<TenantResponse[]> {
  return prisma.tenant.findMany({
    where: { deletedAt: null },
    select: tenantSelect,
    orderBy: { id: "asc" },
  });
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
