import { prisma } from "../config/prisma";
import { CreatePermissionInput, PermissionResponse, UpdatePermissionInput } from "../interfaces/permission";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";

const permissionSelect = {
  id: true,
  tenantId: true,
  moduleId: true,
  actionId: true,
  name: true,
  code: true,
  description: true,
  isSystem: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getPermissions(params: {
  tenantId?: bigint;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<PermissionResponse>> {
  const where = { deletedAt: null, ...(params.tenantId !== undefined && { tenantId: params.tenantId }) };
  const { skip, take } = toSkipTake(params.page, params.pageSize);

  const [data, total] = await Promise.all([
    prisma.permission.findMany({ where, select: permissionSelect, orderBy: { id: "asc" }, skip, take }),
    prisma.permission.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, params.page, params.pageSize) };
}

export function getPermissionById(id: bigint): Promise<PermissionResponse | null> {
  return prisma.permission.findFirst({ where: { id, deletedAt: null }, select: permissionSelect });
}

export function createPermission(input: CreatePermissionInput): Promise<PermissionResponse> {
  return prisma.permission.create({ data: input, select: permissionSelect });
}

export function updatePermission(id: bigint, input: UpdatePermissionInput): Promise<PermissionResponse> {
  return prisma.permission.update({ where: { id }, data: input, select: permissionSelect });
}

export function deletePermission(id: bigint): Promise<PermissionResponse> {
  return prisma.permission.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: permissionSelect,
  });
}
