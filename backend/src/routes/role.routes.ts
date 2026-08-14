import { Router } from "express";
import * as roleController from "../controllers/role.controller";
import * as rolePermissionController from "../controllers/rolePermission.controller";
import * as roleService from "../services/role.service";
import { requireOwnTenant } from "../middlewares/requireOwnTenant";
import { asyncHandler } from "../utils";

export const roleRouter = Router();

const ownTenant = requireOwnTenant((id) => roleService.getRoleById(id).then((r) => r?.tenantId ?? null));

roleRouter.get("/", asyncHandler(roleController.getRoles));
roleRouter.get("/:id", ownTenant, asyncHandler(roleController.getRoleById));
roleRouter.post("/", asyncHandler(roleController.createRole));
roleRouter.put("/:id", ownTenant, asyncHandler(roleController.updateRole));
roleRouter.delete("/:id", ownTenant, asyncHandler(roleController.deleteRole));

roleRouter.get("/:id/permissions", ownTenant, asyncHandler(rolePermissionController.getPermissionsForRole));
roleRouter.post("/:id/permissions", ownTenant, asyncHandler(rolePermissionController.assignPermissionToRole));
roleRouter.delete(
  "/:id/permissions/:permissionId",
  ownTenant,
  asyncHandler(rolePermissionController.revokePermissionFromRole),
);
