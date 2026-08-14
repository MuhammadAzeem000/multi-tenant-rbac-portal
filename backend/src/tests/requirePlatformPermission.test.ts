import { Request, Response } from "express";
import { requirePlatformPermission } from "../middlewares/requirePlatformPermission";
import * as platformAuthService from "../services/platformAuth.service";

jest.mock("../services/platformAuth.service", () => ({
  isPlatformTenant: jest.fn(),
  userHasPermission: jest.fn(),
}));

const mockedService = platformAuthService as unknown as {
  isPlatformTenant: jest.Mock;
  userHasPermission: jest.Mock;
};

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("requirePlatformPermission", () => {
  it("responds 403 when the caller isn't on the platform tenant", async () => {
    mockedService.isPlatformTenant.mockResolvedValue(false);
    const req = { auth: { userId: 1n, tenantId: 5n, username: "alice" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requirePlatformPermission("platform_tenants", "view")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 403 when the caller lacks the specific permission", async () => {
    mockedService.isPlatformTenant.mockResolvedValue(true);
    mockedService.userHasPermission.mockResolvedValue(false);
    const req = { auth: { userId: 1n, tenantId: 5n, username: "alice" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requirePlatformPermission("platform_tenants", "delete")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the caller is a platform member with the permission", async () => {
    mockedService.isPlatformTenant.mockResolvedValue(true);
    mockedService.userHasPermission.mockResolvedValue(true);
    const req = { auth: { userId: 1n, tenantId: 5n, username: "alice" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requirePlatformPermission("platform_tenants", "view")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
