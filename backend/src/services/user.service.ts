import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";
import { CreateUserInput, UpdateUserInput, UserResponse } from "../interfaces/user";

const SALT_ROUNDS = 10;

const userSelect = {
  id: true,
  tenantId: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  avatarUrl: true,
  jobTitle: true,
  employeeCode: true,
  status: true,
  isActive: true,
  isVerified: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  lastLoginAt: true,
  lastLoginIp: true,
  timezone: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getUsers(params: {
  tenantId?: bigint;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<UserResponse>> {
  const where = { deletedAt: null, ...(params.tenantId !== undefined && { tenantId: params.tenantId }) };
  const { skip, take } = toSkipTake(params.page, params.pageSize);

  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, orderBy: { id: "asc" }, skip, take }),
    prisma.user.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, params.page, params.pageSize) };
}

export function getUserById(id: bigint): Promise<UserResponse | null> {
  return prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
}

export async function createUser(input: CreateUserInput): Promise<UserResponse> {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      username: input.username,
      email: input.email,
      phone: input.phone,
      passwordHash,
      jobTitle: input.jobTitle,
      employeeCode: input.employeeCode,
      timezone: input.timezone,
      locale: input.locale,
    },
    select: userSelect,
  });
}

export async function updateUser(id: bigint, input: UpdateUserInput): Promise<UserResponse> {
  const { password, ...rest } = input;

  return prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password !== undefined && { passwordHash: await bcrypt.hash(password, SALT_ROUNDS) }),
    },
    select: userSelect,
  });
}

export function deleteUser(id: bigint): Promise<UserResponse> {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: userSelect,
  });
}
