import { NextFunction, Request, Response } from "express";
import * as platformAuthService from "../services/platformAuth.service";

async function run(req: Request, res: Response, next: NextFunction, moduleName: string, actionName: string) {
  const allowed = await platformAuthService.hasModulePermission(
    req.auth!.tenantId,
    req.auth!.userId,
    moduleName,
    actionName,
  );
  if (!allowed) {
    res.status(403).json({ error: "You don't have permission to perform this action" });
    return;
  }

  next();
}

// Deliberately returns the underlying promise (unlike the asyncHandler route-handler
// wrapper) so this is awaitable in tests, while `.catch(next)` still reports failures
// to Express the normal way.
//
// Not platform-exclusive: any tenant (platform, reseller, or leaf) that has
// moduleName enabled and grants actionName on it via its own roles passes.
// Reaching into a *different* tenant's data is authorized separately, via
// the tenant hierarchy (tenant.service.isAncestorOf) — this only gates
// whether the caller may act within their own tenant at all.
export function requireModulePermission(moduleName: string, actionName: string) {
  return (req: Request, res: Response, next: NextFunction) =>
    run(req, res, next, moduleName, actionName).catch(next);
}
