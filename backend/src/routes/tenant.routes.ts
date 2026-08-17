import { Router } from "express";
import * as tenantController from "../controllers/tenant.controller";
import { requirePlatformPermission } from "../middlewares/requirePlatformPermission";
import { PLATFORM_MODULES } from "../services/platformAuth.service";
import { asyncHandler } from "../utils";

export const tenantRouter = Router();

const requireTenantView = requirePlatformPermission(PLATFORM_MODULES.TENANTS, "View");
const requireTenantCreate = requirePlatformPermission(PLATFORM_MODULES.TENANTS, "Create");
const requireTenantUpdate = requirePlatformPermission(PLATFORM_MODULES.TENANTS, "Update");
const requireTenantDelete = requirePlatformPermission(PLATFORM_MODULES.TENANTS, "Delete");

// Listing/creating/deleting spans every tenant, so it's platform-permission only.
tenantRouter.get("/", requireTenantView, asyncHandler(tenantController.getTenants));
tenantRouter.post("/", requireTenantCreate, asyncHandler(tenantController.createTenant));
tenantRouter.delete("/:id", requireTenantDelete, asyncHandler(tenantController.deleteTenant));

// Getting/updating a single tenant is available to that tenant's own members too
// (self-access check lives inside the controller), so no route-level gate here.
tenantRouter.get("/:id", asyncHandler(tenantController.getTenantById));
tenantRouter.put("/:id", asyncHandler(tenantController.updateTenant));

// Suspend/activate is exclusively a platform action — not reachable by a tenant's own members.
tenantRouter.patch("/:id/status", requireTenantUpdate, asyncHandler(tenantController.setTenantStatus));
