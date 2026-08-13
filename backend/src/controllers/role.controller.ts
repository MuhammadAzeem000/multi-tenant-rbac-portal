import { Request, Response } from "express";
import { z } from "zod";
import { createRoleSchema, updateRoleSchema } from "../interfaces/role";
import * as roleService from "../services/role.service";
import { parseBigIntId } from "../utils";

function parseId(req: Request, res: Response): bigint | null {
  const id = parseBigIntId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid role id" });
    return null;
  }
  return id;
}

export async function getRoles(req: Request, res: Response) {
  const tenantId = req.query.tenantId ? parseBigIntId(String(req.query.tenantId)) : undefined;
  if (req.query.tenantId && tenantId === null) {
    res.status(400).json({ error: "Invalid tenantId" });
    return;
  }
  const roles = await roleService.getRoles(tenantId ?? undefined);
  res.json(roles);
}

export async function getRoleById(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const role = await roleService.getRoleById(id);
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  res.json(role);
}

export async function createRole(req: Request, res: Response) {
  const result = createRoleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const role = await roleService.createRole(result.data);
  res.status(201).json(role);
}

export async function updateRole(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = updateRoleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const role = await roleService.updateRole(id, result.data);
  res.json(role);
}

export async function deleteRole(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  await roleService.deleteRole(id);
  res.status(204).send();
}
