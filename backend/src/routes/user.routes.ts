import { Router } from "express";
import * as userController from "../controllers/user.controller";
import * as userRoleController from "../controllers/userRole.controller";
import * as userDepartmentController from "../controllers/userDepartment.controller";
import * as userService from "../services/user.service";
import { requireOwnTenant } from "../middlewares/requireOwnTenant";
import { asyncHandler } from "../utils";

export const userRouter = Router();

const ownTenant = requireOwnTenant((id) => userService.getUserById(id).then((u) => u?.tenantId ?? null));

userRouter.get("/", asyncHandler(userController.getUsers));
userRouter.get("/:id", ownTenant, asyncHandler(userController.getUserById));
userRouter.post("/", asyncHandler(userController.createUser));
userRouter.put("/:id", ownTenant, asyncHandler(userController.updateUser));
userRouter.delete("/:id", ownTenant, asyncHandler(userController.deleteUser));

userRouter.get("/:id/roles", ownTenant, asyncHandler(userRoleController.getRolesForUser));
userRouter.post("/:id/roles", ownTenant, asyncHandler(userRoleController.assignRoleToUser));
userRouter.delete("/:id/roles/:roleId", ownTenant, asyncHandler(userRoleController.revokeRoleFromUser));

userRouter.get("/:id/departments", ownTenant, asyncHandler(userDepartmentController.getDepartmentsForUser));
userRouter.post("/:id/departments", ownTenant, asyncHandler(userDepartmentController.assignDepartmentToUser));
userRouter.delete(
  "/:id/departments/:departmentId",
  ownTenant,
  asyncHandler(userDepartmentController.revokeDepartmentFromUser),
);
