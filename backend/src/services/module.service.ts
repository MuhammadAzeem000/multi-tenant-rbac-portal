import { prisma } from "../config/prisma";
import { CreateModuleInput, ModuleResponse, UpdateModuleInput } from "../interfaces/module";

const moduleSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  icon: true,
  route: true,
  sortOrder: true,
  isSystem: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function getModules(): Promise<ModuleResponse[]> {
  return prisma.module.findMany({
    where: { deletedAt: null },
    select: moduleSelect,
    orderBy: { sortOrder: "asc" },
  });
}

export function getModuleById(id: bigint): Promise<ModuleResponse | null> {
  return prisma.module.findFirst({ where: { id, deletedAt: null }, select: moduleSelect });
}

export function createModule(input: CreateModuleInput): Promise<ModuleResponse> {
  return prisma.module.create({ data: input, select: moduleSelect });
}

export function updateModule(id: bigint, input: UpdateModuleInput): Promise<ModuleResponse> {
  return prisma.module.update({ where: { id }, data: input, select: moduleSelect });
}

export function deleteModule(id: bigint): Promise<ModuleResponse> {
  return prisma.module.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: moduleSelect,
  });
}
