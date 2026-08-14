import { Router } from "express";
import * as platformController from "../controllers/platform.controller";
import { requirePlatformPermission } from "../middlewares/requirePlatformPermission";
import { PLATFORM_MODULES } from "../services/platformAuth.service";
import { asyncHandler } from "../utils";

export const platformRouter = Router();

// Cross-tenant reads live here exclusively — the regular /api/users endpoint
// always stays confined to the caller's own tenant, with no escape hatch.
platformRouter.get(
  "/tenants/:id/users",
  requirePlatformPermission(PLATFORM_MODULES.TENANTS, "view"),
  asyncHandler(platformController.getUsersForTenant),
);

platformRouter.get(
  "/audit-logs",
  requirePlatformPermission(PLATFORM_MODULES.AUDIT_LOGS, "view"),
  asyncHandler(platformController.getAuditLogs),
);

// Module entitlement ("subscription") management — which modules a tenant has access to.
platformRouter.get(
  "/tenants/:id/modules",
  requirePlatformPermission(PLATFORM_MODULES.TENANTS, "view"),
  asyncHandler(platformController.getTenantModules),
);
platformRouter.patch(
  "/tenants/:id/modules/:moduleId",
  requirePlatformPermission(PLATFORM_MODULES.TENANTS, "update"),
  asyncHandler(platformController.setTenantModule),
);
