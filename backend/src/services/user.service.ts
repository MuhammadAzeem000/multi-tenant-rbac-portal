import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { CreateUserInput, UpdateUserInput, UserResponse } from "../interfaces/user";

const SALT_ROUNDS = 10;

const userSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

export function getUsers(): Promise<UserResponse[]> {
  return prisma.user.findMany({ select: userSelect });
}

export function getUserById(id: number): Promise<UserResponse | null> {
  return prisma.user.findUnique({ where: { id }, select: userSelect });
}

export async function createUser(input: CreateUserInput): Promise<UserResponse> {
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
    },
    select: userSelect,
  });
}

export async function updateUser(
  id: number,
  input: UpdateUserInput,
): Promise<UserResponse> {
  const data: { name?: string; email?: string; password?: string } = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.email !== undefined && { email: input.email }),
  };

  if (input.password !== undefined) {
    data.password = await bcrypt.hash(input.password, SALT_ROUNDS);
  }

  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
}

export function deleteUser(id: number): Promise<UserResponse> {
  return prisma.user.delete({ where: { id }, select: userSelect });
}
