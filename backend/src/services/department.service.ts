import { prisma } from "../config/prisma";
import { CreateDepartmentInput, DepartmentResponse, UpdateDepartmentInput } from "../interfaces/department";

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

export function getDepartments(tenantId?: bigint): Promise<DepartmentResponse[]> {
  return prisma.department.findMany({
    where: { deletedAt: null, ...(tenantId !== undefined && { tenantId }) },
    select: departmentSelect,
    orderBy: { sortOrder: "asc" },
  });
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
