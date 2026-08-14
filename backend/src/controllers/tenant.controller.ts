import { Request, Response } from "express";
import { z } from "zod";
import { createTenantSchema, tenantListQuerySchema, updateTenantSchema } from "../interfaces/tenant";
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

export async function getTenants(req: Request, res: Response) {
  const query = parseQuery(tenantListQuerySchema, req, res);
  if (!query) return;

  const result = await tenantService.getTenants(query);
  res.json(result);
}

export async function getTenantById(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

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

  const tenant = await tenantService.createTenant(result.data);
  res.status(201).json(tenant);
}

export async function updateTenant(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = updateTenantSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const tenant = await tenantService.updateTenant(id, result.data);
  res.json(tenant);
}

export async function deleteTenant(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  if (req.auth!.tenantId === id) {
    res.status(409).json({ error: "You can't delete the tenant you're currently logged into" });
    return;
  }

  await tenantService.deleteTenant(id);
  res.status(204).send();
}
