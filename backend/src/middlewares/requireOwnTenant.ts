import { NextFunction, Request, Response } from "express";
import { parseBigIntId } from "../utils";

async function run(
  req: Request,
  res: Response,
  next: NextFunction,
  getRecordTenantId: (id: bigint) => Promise<bigint | null>,
) {
  const id = parseBigIntId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const recordTenantId = await getRecordTenantId(id);
  if (recordTenantId === null || recordTenantId !== req.auth!.tenantId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  next();
}

/**
 * Confirms the record named by `req.params.id` belongs to the caller's own
 * tenant before the route handler runs. 404s (not 403) on a cross-tenant
 * request so a mismatched id never confirms another tenant's record exists.
 *
 * Deliberately returns the underlying promise (unlike the asyncHandler
 * route-handler wrapper) so this is awaitable in tests.
 */
export function requireOwnTenant(getRecordTenantId: (id: bigint) => Promise<bigint | null>) {
  return (req: Request, res: Response, next: NextFunction) => run(req, res, next, getRecordTenantId).catch(next);
}
