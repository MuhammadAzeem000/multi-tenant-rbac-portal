import { prisma } from "../config/prisma";
import { CreateDepartmentInput, DepartmentResponse, UpdateDepartmentInput } from "../interfaces/department";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";

const departmentSelect = {
  id: true,
  tenantId: true,
  name: true,
  code: true,
  description: true,
  status: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getDepartments(params: {
  tenantId?: bigint;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<DepartmentResponse>> {
  const where = { deletedAt: null, ...(params.tenantId !== undefined && { tenantId: params.tenantId }) };
  const { skip, take } = toSkipTake(params.page, params.pageSize);

  const [data, total] = await Promise.all([
    prisma.department.findMany({ where, select: departmentSelect, orderBy: { sortOrder: "asc" }, skip, take }),
    prisma.department.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, params.page, params.pageSize) };
}

export function getDepartmentById(id: bigint): Promise<DepartmentResponse | null> {
  return prisma.department.findFirst({ where: { id, deletedAt: null }, select: departmentSelect });
}

export function createDepartment(input: CreateDepartmentInput): Promise<DepartmentResponse> {
  return prisma.department.create({ data: input, select: departmentSelect });
}

export function updateDepartment(id: bigint, input: UpdateDepartmentInput): Promise<DepartmentResponse> {
  return prisma.department.update({ where: { id }, data: input, select: departmentSelect });
}

export function deleteDepartment(id: bigint): Promise<DepartmentResponse> {
  return prisma.department.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: departmentSelect,
  });
}
