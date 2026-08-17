import { Router } from "express";
import * as tenantController from "../controllers/tenant.controller";
import { requireModulePermission } from "../middlewares/requireModulePermission";
import { PLATFORM_MODULES } from "../services/platformAuth.service";
import { asyncHandler } from "../utils";

export const tenantRouter = Router();

const requireTenantView = requireModulePermission(PLATFORM_MODULES.TENANTS, "View");
const requireTenantCreate = requireModulePermission(PLATFORM_MODULES.TENANTS, "Create");
const requireTenantUpdate = requireModulePermission(PLATFORM_MODULES.TENANTS, "Update");
const requireTenantDelete = requireModulePermission(PLATFORM_MODULES.TENANTS, "Delete");

// Any tenant with the Tenants module + permission can list/create/delete —
// scoped to its own subtree (self plus descendants), enforced in the
// controller. Not platform-exclusive: a reseller tenant manages its own
// children exactly the same way the platform manages its top-level tenants.
tenantRouter.get("/", requireTenantView, asyncHandler(tenantController.getTenants));
tenantRouter.post("/", requireTenantCreate, asyncHandler(tenantController.createTenant));
tenantRouter.delete("/:id", requireTenantDelete, asyncHandler(tenantController.deleteTenant));

// Getting/updating a single tenant is available to that tenant's own members too
// (self-access check lives inside the controller), so no route-level gate here.
tenantRouter.get("/:id", asyncHandler(tenantController.getTenantById));
tenantRouter.put("/:id", asyncHandler(tenantController.updateTenant));

// Suspend/activate: reachable by the target tenant's own ancestors (checked in
// the controller), never by the tenant's own members.
tenantRouter.patch("/:id/status", requireTenantUpdate, asyncHandler(tenantController.setTenantStatus));
