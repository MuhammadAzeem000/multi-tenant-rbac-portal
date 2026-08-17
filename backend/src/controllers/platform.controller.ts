import { Request, Response } from "express";
import { z } from "zod";
import { setTenantModuleSchema } from "../interfaces/tenantModule";
import * as auditLogService from "../services/auditLog.service";
import * as moduleService from "../services/module.service";
import * as tenantModuleService from "../services/tenantModule.service";
import * as userService from "../services/user.service";
import { parseBigIntId, parsePagination } from "../utils";

export async function getUsersForTenant(req: Request, res: Response) {
  const tenantId = parseBigIntId(req.params.id);
  if (tenantId === null) {
    res.status(400).json({ error: "Invalid tenant id" });
    return;
  }

  const pagination = parsePagination(req, res);
  if (!pagination) return;

  const result = await userService.getUsers({ tenantId, ...pagination });
  res.json(result);
}

export async function getTenantModules(req: Request, res: Response) {
  const tenantId = parseBigIntId(req.params.id);
  if (tenantId === null) {
    res.status(400).json({ error: "Invalid tenant id" });
    return;
  }

  const modules = await tenantModuleService.getModulesForTenant(tenantId);
  res.json({ data: modules });
}

export async function setTenantModule(req: Request, res: Response) {
  const tenantId = parseBigIntId(req.params.id);
  const moduleId = parseBigIntId(req.params.moduleId);
  if (tenantId === null || moduleId === null) {
    res.status(400).json({ error: "Invalid tenant or module id" });
    return;
  }

  const result = setTenantModuleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const module = await moduleService.getModuleById(moduleId);
  if (!module) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  const entitlement = await tenantModuleService.setModuleEnabled(
    tenantId,
    moduleId,
    result.data.isEnabled,
    req.auth!.userId,
  );

  await auditLogService.recordAuditLog({
    actorUserId: req.auth!.userId,
    action: result.data.isEnabled ? "tenant.module.enable" : "tenant.module.disable",
    targetType: "tenant_module",
    targetId: moduleId,
    tenantId,
    metadata: { moduleName: module.name },
  });

  res.json(entitlement);
}

export async function getAuditLogs(req: Request, res: Response) {
  const pagination = parsePagination(req, res);
  if (!pagination) return;

  const result = await auditLogService.getAuditLogs(pagination);
  res.json(result);
}
