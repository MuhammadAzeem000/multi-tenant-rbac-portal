import { prisma } from "../config/prisma";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";
import { CreateRoleInput, RoleResponse, UpdateRoleInput } from "../interfaces/role";

const roleSelect = {
  id: true,
  tenantId: true,
  name: true,
  code: true,
  description: true,
  isSystem: true,
  isDefault: true,
  isActive: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getRoles(params: {
  tenantId?: bigint;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<RoleResponse>> {
  const where = { deletedAt: null, ...(params.tenantId !== undefined && { tenantId: params.tenantId }) };
  const { skip, take } = toSkipTake(params.page, params.pageSize);

  const [data, total] = await Promise.all([
    prisma.role.findMany({ where, select: roleSelect, orderBy: { priority: "desc" }, skip, take }),
    prisma.role.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, params.page, params.pageSize) };
}

export function getRoleById(id: bigint): Promise<RoleResponse | null> {
  return prisma.role.findFirst({ where: { id, deletedAt: null }, select: roleSelect });
}

export function createRole(input: CreateRoleInput): Promise<RoleResponse> {
  return prisma.role.create({ data: input, select: roleSelect });
}

export function updateRole(id: bigint, input: UpdateRoleInput): Promise<RoleResponse> {
  return prisma.role.update({ where: { id }, data: input, select: roleSelect });
}

export function deleteRole(id: bigint): Promise<RoleResponse> {
  return prisma.role.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: roleSelect,
  });
}
