import { Request, Response } from "express";
import { z } from "zod";
import { createUserSchema, updateUserSchema, userListQuerySchema } from "../interfaces/user";
import * as userService from "../services/user.service";
import { parseBigIntId, parseQuery } from "../utils";

function parseId(req: Request, res: Response): bigint | null {
  const id = parseBigIntId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid user id" });
    return null;
  }
  return id;
}

export async function getUsers(req: Request, res: Response) {
  const query = parseQuery(userListQuerySchema, req, res);
  if (!query) return;

  // Always scoped to the caller's own tenant — a tenantId in the query string is ignored.
  const result = await userService.getUsers({ tenantId: req.auth!.tenantId, ...query });
  res.json(result);
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

  // The tenant is always the caller's own — never client-supplied.
  const user = await userService.createUser({ ...result.data, tenantId: req.auth!.tenantId });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  if (req.auth!.userId === id && result.data.isActive !== undefined) {
    res.status(409).json({ error: "You can't change your own active status" });
    return;
  }

  const user = await userService.updateUser(id, result.data);
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  if (req.auth!.userId === id) {
    res.status(409).json({ error: "You can't delete your own account" });
    return;
  }

  await userService.deleteUser(id);
  res.status(204).send();
}
