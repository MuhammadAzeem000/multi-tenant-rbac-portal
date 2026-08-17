import { Router } from "express";
import * as platformController from "../controllers/platform.controller";
import { requireModulePermission } from "../middlewares/requireModulePermission";
import { PLATFORM_MODULES } from "../services/platformAuth.service";
import { asyncHandler } from "../utils";

export const platformRouter = Router();

// Cross-tenant reads live here — the regular /api/users endpoint always
// stays confined to the caller's own tenant, with no escape hatch. Reachable
// by any tenant with the Tenants module + permission, but the controller
// additionally checks that :id is the caller's own tenant or a descendant of
// it — this route is not platform-exclusive, so that check is load-bearing.
platformRouter.get(
  "/tenants/:id/users",
  requireModulePermission(PLATFORM_MODULES.TENANTS, "View"),
  asyncHandler(platformController.getUsersForTenant),
);

platformRouter.get(
  "/audit-logs",
  requireModulePermission(PLATFORM_MODULES.AUDIT_LOGS, "View"),
  asyncHandler(platformController.getAuditLogs),
);

// Module entitlement ("subscription") management — which modules a tenant has access to.
platformRouter.get(
  "/tenants/:id/modules",
  requireModulePermission(PLATFORM_MODULES.TENANTS, "View"),
  asyncHandler(platformController.getTenantModules),
);
platformRouter.patch(
  "/tenants/:id/modules/:moduleId",
  requireModulePermission(PLATFORM_MODULES.TENANTS, "Update"),
  asyncHandler(platformController.setTenantModule),
);
