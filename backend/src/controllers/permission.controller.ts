import { Request, Response } from "express";
import { z } from "zod";
import { createPermissionSchema, updatePermissionSchema } from "../interfaces/permission";
import * as permissionService from "../services/permission.service";
import { parseBigIntId, parsePagination } from "../utils";

function parseId(req: Request, res: Response): bigint | null {
  const id = parseBigIntId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid permission id" });
    return null;
  }
  return id;
}

export async function getPermissions(req: Request, res: Response) {
  const pagination = parsePagination(req, res);
  if (!pagination) return;

  const tenantId = req.query.tenantId ? parseBigIntId(String(req.query.tenantId)) : undefined;
  if (req.query.tenantId && tenantId === null) {
    res.status(400).json({ error: "Invalid tenantId" });
    return;
  }

  const result = await permissionService.getPermissions({ tenantId: tenantId ?? undefined, ...pagination });
  res.json(result);
}

export async function getPermissionById(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const permission = await permissionService.getPermissionById(id);
  if (!permission) {
    res.status(404).json({ error: "Permission not found" });
    return;
  }
  res.json(permission);
}

export async function createPermission(req: Request, res: Response) {
  const result = createPermissionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const permission = await permissionService.createPermission(result.data);
  res.status(201).json(permission);
}

export async function updatePermission(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = updatePermissionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const permission = await permissionService.updatePermission(id, result.data);
  res.json(permission);
}

export async function deletePermission(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  await permissionService.deletePermission(id);
  res.status(204).send();
}
