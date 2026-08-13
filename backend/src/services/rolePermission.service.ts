import { prisma } from "../config/prisma";

const permissionSelect = {
  id: true,
  name: true,
  code: true,
  moduleId: true,
  actionId: true,
} as const;

export function getPermissionsForRole(roleId: bigint) {
  return prisma.rolePermission
    .findMany({
      where: { roleId },
      include: { permission: { select: permissionSelect } },
      orderBy: { createdAt: "asc" },
    })
    .then((rows) => rows.map((row) => ({ ...row.permission, assignedAt: row.createdAt })));
}

export function assignPermissionToRole(tenantId: bigint, roleId: bigint, permissionId: bigint) {
  return prisma.rolePermission.create({
    data: { tenantId, roleId, permissionId },
    include: { permission: { select: permissionSelect } },
  });
}

export async function revokePermissionFromRole(roleId: bigint, permissionId: bigint): Promise<boolean> {
  const { count } = await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  return count > 0;
}
