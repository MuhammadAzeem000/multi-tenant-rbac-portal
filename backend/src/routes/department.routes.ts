import { Router } from "express";
import * as departmentController from "../controllers/department.controller";
import * as departmentService from "../services/department.service";
import { requireOwnTenant } from "../middlewares/requireOwnTenant";
import { asyncHandler } from "../utils";

export const departmentRouter = Router();

const ownTenant = requireOwnTenant((id) =>
  departmentService.getDepartmentById(id).then((d) => d?.tenantId ?? null),
);

departmentRouter.get("/", asyncHandler(departmentController.getDepartments));
departmentRouter.get("/:id", ownTenant, asyncHandler(departmentController.getDepartmentById));
departmentRouter.post("/", asyncHandler(departmentController.createDepartment));
departmentRouter.put("/:id", ownTenant, asyncHandler(departmentController.updateDepartment));
departmentRouter.delete("/:id", ownTenant, asyncHandler(departmentController.deleteDepartment));
