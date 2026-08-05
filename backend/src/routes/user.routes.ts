import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { asyncHandler } from "../utils";

export const userRouter = Router();

userRouter.get("/", asyncHandler(userController.getUsers));
userRouter.get("/:id", asyncHandler(userController.getUserById));
userRouter.post("/", asyncHandler(userController.createUser));
userRouter.put("/:id", asyncHandler(userController.updateUser));
userRouter.delete("/:id", asyncHandler(userController.deleteUser));
