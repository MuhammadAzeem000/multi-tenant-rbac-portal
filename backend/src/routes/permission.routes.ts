import { Router } from "express";
import * as permissionController from "../controllers/permission.controller";
import * as permissionService from "../services/permission.service";
import { requireOwnTenant } from "../middlewares/requireOwnTenant";
import { asyncHandler } from "../utils";

export const permissionRouter = Router();

const ownTenant = requireOwnTenant((id) =>
  permissionService.getPermissionById(id).then((p) => p?.tenantId ?? null),
);

permissionRouter.get("/", asyncHandler(permissionController.getPermissions));
permissionRouter.get("/:id", ownTenant, asyncHandler(permissionController.getPermissionById));
permissionRouter.post("/", asyncHandler(permissionController.createPermission));
permissionRouter.put("/:id", ownTenant, asyncHandler(permissionController.updatePermission));
permissionRouter.delete("/:id", ownTenant, asyncHandler(permissionController.deletePermission));
