import { prisma } from "../config/prisma";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";

const departmentSelect = {
  id: true,
  name: true,
  code: true,
} as const;

export async function getDepartmentsForUser(
  userId: bigint,
  params: { page: number; pageSize: number },
): Promise<
  PaginatedResult<{ id: bigint; name: string; code: string | null; isPrimary: boolean; assignedAt: Date }>
> {
  const where = { userId };
  const { skip, take } = toSkipTake(params.page, params.pageSize);

  const [rows, total] = await Promise.all([
    prisma.userDepartment.findMany({
      where,
      include: { department: { select: departmentSelect } },
      orderBy: { createdAt: "asc" },
      skip,
      take,
    }),
    prisma.userDepartment.count({ where }),
  ]);

  const data = rows.map((row) => ({ ...row.department, isPrimary: row.isPrimary, assignedAt: row.createdAt }));
  return { data, pagination: buildPaginationMeta(total, params.page, params.pageSize) };
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
