import { prisma } from "../config/prisma";
import { ActionResponse, CreateActionInput, UpdateActionInput } from "../interfaces/action";

const actionSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  sortOrder: true,
  isSystem: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function getActions(): Promise<ActionResponse[]> {
  return prisma.action.findMany({
    where: { deletedAt: null },
    select: actionSelect,
    orderBy: { sortOrder: "asc" },
  });
}

export function getActionById(id: bigint): Promise<ActionResponse | null> {
  return prisma.action.findFirst({ where: { id, deletedAt: null }, select: actionSelect });
}

export function createAction(input: CreateActionInput): Promise<ActionResponse> {
  return prisma.action.create({ data: input, select: actionSelect });
}

export function updateAction(id: bigint, input: UpdateActionInput): Promise<ActionResponse> {
  return prisma.action.update({ where: { id }, data: input, select: actionSelect });
}

export function deleteAction(id: bigint): Promise<ActionResponse> {
  return prisma.action.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: actionSelect,
  });
}
