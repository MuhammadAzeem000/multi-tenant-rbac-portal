import { Request, Response } from "express";
import { requireModulePermission } from "../middlewares/requireModulePermission";
import * as platformAuthService from "../services/platformAuth.service";

jest.mock("../services/platformAuth.service", () => ({
  hasModulePermission: jest.fn(),
}));

const mockedService = platformAuthService as unknown as {
  hasModulePermission: jest.Mock;
};

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("requireModulePermission", () => {
  it("responds 403 when the caller's tenant doesn't have the module or permission", async () => {
    mockedService.hasModulePermission.mockResolvedValue(false);
    const req = { auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requireModulePermission("Tenants", "View")(req, res, next);

    expect(mockedService.hasModulePermission).toHaveBeenCalledWith(5n, 1n, "Tenants", "View");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the caller's tenant has the module enabled and the role grants the permission", async () => {
    mockedService.hasModulePermission.mockResolvedValue(true);
    const req = { auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requireModulePermission("Tenants", "Create")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
