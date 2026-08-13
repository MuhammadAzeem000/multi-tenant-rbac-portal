import { prisma } from "../config/prisma";

const roleSelect = {
  id: true,
  name: true,
  code: true,
  priority: true,
} as const;

export function getRolesForUser(userId: bigint) {
  return prisma.userRole
    .findMany({
      where: { userId },
      include: { role: { select: roleSelect } },
      orderBy: { createdAt: "asc" },
    })
    .then((rows) => rows.map((row) => ({ ...row.role, assignedAt: row.createdAt })));
}

export function assignRoleToUser(tenantId: bigint, userId: bigint, roleId: bigint) {
  return prisma.userRole.create({
    data: { tenantId, userId, roleId },
    include: { role: { select: roleSelect } },
  });
}

export async function revokeRoleFromUser(userId: bigint, roleId: bigint): Promise<boolean> {
  const { count } = await prisma.userRole.deleteMany({ where: { userId, roleId } });
  return count > 0;
}
