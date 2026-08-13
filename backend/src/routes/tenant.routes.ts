import { Router } from "express";
import * as tenantController from "../controllers/tenant.controller";
import { asyncHandler } from "../utils";

export const tenantRouter = Router();

tenantRouter.get("/", asyncHandler(tenantController.getTenants));
tenantRouter.get("/:id", asyncHandler(tenantController.getTenantById));
tenantRouter.post("/", asyncHandler(tenantController.createTenant));
tenantRouter.put("/:id", asyncHandler(tenantController.updateTenant));
tenantRouter.delete("/:id", asyncHandler(tenantController.deleteTenant));
