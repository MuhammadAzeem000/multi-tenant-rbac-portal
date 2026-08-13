import { prisma } from "../config/prisma";
import { CreatePermissionInput, PermissionResponse, UpdatePermissionInput } from "../interfaces/permission";

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

export function getPermissions(tenantId?: bigint): Promise<PermissionResponse[]> {
  return prisma.permission.findMany({
    where: { deletedAt: null, ...(tenantId !== undefined && { tenantId }) },
    select: permissionSelect,
    orderBy: { id: "asc" },
  });
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
