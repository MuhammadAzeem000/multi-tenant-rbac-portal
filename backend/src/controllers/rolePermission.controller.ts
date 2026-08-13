import { Request, Response } from "express";
import { z } from "zod";
import { bigIntId } from "../interfaces/common";
import * as permissionService from "../services/permission.service";
import * as roleService from "../services/role.service";
import * as rolePermissionService from "../services/rolePermission.service";
import { parseBigIntId } from "../utils";

const assignPermissionSchema = z.object({ permissionId: bigIntId });

export async function getPermissionsForRole(req: Request, res: Response) {
  const roleId = parseBigIntId(req.params.id);
  if (roleId === null) {
    res.status(400).json({ error: "Invalid role id" });
    return;
  }

  const role = await roleService.getRoleById(roleId);
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  const permissions = await rolePermissionService.getPermissionsForRole(roleId);
  res.json(permissions);
}

export async function assignPermissionToRole(req: Request, res: Response) {
  const roleId = parseBigIntId(req.params.id);
  if (roleId === null) {
    res.status(400).json({ error: "Invalid role id" });
    return;
  }

  const result = assignPermissionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const role = await roleService.getRoleById(roleId);
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  const permission = await permissionService.getPermissionById(result.data.permissionId);
  if (!permission) {
    res.status(404).json({ error: "Permission not found" });
    return;
  }

  if (permission.tenantId !== role.tenantId) {
    res.status(400).json({ error: "Permission belongs to a different tenant" });
    return;
  }

  const assignment = await rolePermissionService.assignPermissionToRole(role.tenantId, roleId, permission.id);
  res.status(201).json(assignment);
}

export async function revokePermissionFromRole(req: Request, res: Response) {
  const roleId = parseBigIntId(req.params.id);
  const permissionId = parseBigIntId(req.params.permissionId);
  if (roleId === null || permissionId === null) {
    res.status(400).json({ error: "Invalid role or permission id" });
    return;
  }

  const revoked = await rolePermissionService.revokePermissionFromRole(roleId, permissionId);
  if (!revoked) {
    res.status(404).json({ error: "Permission assignment not found" });
    return;
  }
  res.status(204).send();
}
