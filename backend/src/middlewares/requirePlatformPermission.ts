import { NextFunction, Request, Response } from "express";
import * as platformAuthService from "../services/platformAuth.service";

async function run(req: Request, res: Response, next: NextFunction, moduleName: string, actionName: string) {
  const isPlatform = await platformAuthService.isPlatformTenant(req.auth!.tenantId);
  if (!isPlatform) {
    res.status(403).json({ error: "Platform access required" });
    return;
  }

  const allowed = await platformAuthService.userHasPermission(req.auth!.userId, moduleName, actionName);
  if (!allowed) {
    res.status(403).json({ error: "You don't have permission to perform this action" });
    return;
  }

  next();
}

// Deliberately returns the underlying promise (unlike the asyncHandler route-handler
// wrapper) so this is awaitable in tests, while `.catch(next)` still reports failures
// to Express the normal way.
export function requirePlatformPermission(moduleName: string, actionName: string) {
  return (req: Request, res: Response, next: NextFunction) =>
    run(req, res, next, moduleName, actionName).catch(next);
}
