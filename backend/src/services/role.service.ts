import { prisma } from "../config/prisma";
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

export function getRoles(tenantId?: bigint): Promise<RoleResponse[]> {
  return prisma.role.findMany({
    where: { deletedAt: null, ...(tenantId !== undefined && { tenantId }) },
    select: roleSelect,
    orderBy: { priority: "desc" },
  });
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
