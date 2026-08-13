import { prisma } from "../config/prisma";

const departmentSelect = {
  id: true,
  name: true,
  code: true,
} as const;

export function getDepartmentsForUser(userId: bigint) {
  return prisma.userDepartment
    .findMany({
      where: { userId },
      include: { department: { select: departmentSelect } },
      orderBy: { createdAt: "asc" },
    })
    .then((rows) =>
      rows.map((row) => ({ ...row.department, isPrimary: row.isPrimary, assignedAt: row.createdAt })),
    );
}

export function assignDepartmentToUser(
  tenantId: bigint,
  userId: bigint,
  departmentId: bigint,
  isPrimary: boolean,
) {
  return prisma.userDepartment.create({
    data: { tenantId, userId, departmentId, isPrimary },
    include: { department: { select: departmentSelect } },
  });
}

export async function revokeDepartmentFromUser(userId: bigint, departmentId: bigint): Promise<boolean> {
  const { count } = await prisma.userDepartment.deleteMany({ where: { userId, departmentId } });
  return count > 0;
}
