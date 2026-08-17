import { Request, Response } from "express";
import { z } from "zod";
import { createTenantSchema, tenantListQuerySchema, updateTenantSchema } from "../interfaces/tenant";
import * as auditLogService from "../services/auditLog.service";
import * as platformAuthService from "../services/platformAuth.service";
import { PLATFORM_MODULES } from "../services/platformAuth.service";
import * as tenantService from "../services/tenant.service";
import { parseBigIntId, parseQuery } from "../utils";

function parseId(req: Request, res: Response): bigint | null {
  const id = parseBigIntId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid tenant id" });
    return null;
  }
  return id;
}

// A tenant is always reachable by its own members (self); reachable by anyone
// else only if the caller's own tenant is an ancestor of it (i.e. the caller
// is somewhere up its creation chain) and holds the matching permission.
// Not platform-exclusive: a reseller tenant reaches its own descendants the
// same way the platform reaches everyone (since everyone descends from it).
async function canAccessTenant(req: Request, id: bigint, actionName: string): Promise<boolean> {
  if (req.auth!.tenantId === id) return true;

  const isAncestor = await tenantService.isAncestorOf(req.auth!.tenantId, id);
  if (!isAncestor) return false;

  return platformAuthService.hasModulePermission(req.auth!.tenantId, req.auth!.userId, PLATFORM_MODULES.TENANTS, actionName);
}

export async function getTenants(req: Request, res: Response) {
  const query = parseQuery(tenantListQuerySchema, req, res);
  if (!query) return;

  // Always scoped to the caller's own subtree (self plus descendants) —
  // never siblings or ancestors, regardless of what permissions they hold.
  const visibleTenantIds = await tenantService.getDescendantTenantIds(req.auth!.tenantId);
  const result = await tenantService.getTenants({ ...query, visibleTenantIds });
  res.json(result);
}

export async function getTenantById(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  if (!(await canAccessTenant(req, id, "View"))) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const tenant = await tenantService.getTenantById(id);
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json(tenant);
}

export async function createTenant(req: Request, res: Response) {
  const result = createTenantSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  // The new tenant's parent is always the creating admin's own tenant —
  // never client-supplied. This is what makes "any parent tenant's own
  // admins can create children" work: creating under yourself needs no
  // extra reach check, unlike touching an *existing* tenant.
  const tenant = await tenantService.createTenant(result.data, req.auth!.tenantId);

  await auditLogService.recordAuditLog({
    actorUserId: req.auth!.userId,
    action: "tenant.create",
    targetType: "tenant",
    targetId: tenant.id,
    tenantId: tenant.id,
  });

  res.status(201).json(tenant);
}

export async function updateTenant(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  if (!(await canAccessTenant(req, id, "Update"))) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const result = updateTenantSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  if (result.data.isActive !== undefined) {
    res.status(400).json({ error: "Use PATCH /tenants/:id/status to change a tenant's active status" });
    return;
  }

  const tenant = await tenantService.updateTenant(id, result.data);
  res.json(tenant);
}

const setTenantStatusSchema = z.object({ isActive: z.boolean() });

export async function setTenantStatus(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = setTenantStatusSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  if (req.auth!.tenantId === id) {
    res.status(409).json({ error: "You can't change the active status of the tenant you're currently logged into" });
    return;
  }

  if (!(await tenantService.isAncestorOf(req.auth!.tenantId, id))) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const tenant = await tenantService.setTenantStatus(id, result.data.isActive);

  await auditLogService.recordAuditLog({
    actorUserId: req.auth!.userId,
    action: result.data.isActive ? "tenant.activate" : "tenant.suspend",
    targetType: "tenant",
    targetId: id,
    tenantId: id,
  });

  res.json(tenant);
}

export async function deleteTenant(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  if (req.auth!.tenantId === id) {
    res.status(409).json({ error: "You can't delete the tenant you're currently logged into" });
    return;
  }

  if (!(await tenantService.isAncestorOf(req.auth!.tenantId, id))) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  if (await tenantService.tenantHasDependents(id)) {
    res.status(409).json({
      error:
        "This tenant still has users, roles, departments, permissions, or child tenants. Remove them before deleting the tenant.",
    });
    return;
  }

  await tenantService.deleteTenant(id);

  await auditLogService.recordAuditLog({
    actorUserId: req.auth!.userId,
    action: "tenant.delete",
    targetType: "tenant",
    targetId: id,
    tenantId: id,
  });

  res.status(204).send();
}
