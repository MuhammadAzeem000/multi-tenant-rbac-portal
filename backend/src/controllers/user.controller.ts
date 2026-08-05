import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { createUserSchema, updateUserSchema } from "../interfaces/user";
import * as userService from "../services/user.service";

function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid user id" });
    return null;
  }
  return id;
}

export async function getUsers(_req: Request, res: Response) {
  const users = await userService.getUsers();
  res.json(users);
}

export async function getUserById(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const user = await userService.getUserById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
}

export async function createUser(req: Request, res: Response) {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  try {
    const user = await userService.createUser(result.data);
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    throw err;
  }
}

export async function updateUser(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  try {
    const user = await userService.updateUser(id, result.data);
    res.json(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (err.code === "P2002") {
        res.status(409).json({ error: "Email already in use" });
        return;
      }
    }
    throw err;
  }
}

export async function deleteUser(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    await userService.deleteUser(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      res.status(404).json({ error: "User not found" });
      return;
    }
    throw err;
  }
}
