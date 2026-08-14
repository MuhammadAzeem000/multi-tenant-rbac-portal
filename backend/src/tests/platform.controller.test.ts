import "../utils/bigint";
import { Request, Response } from "express";
import * as platformController from "../controllers/platform.controller";
import { prisma } from "../config/prisma";
import { __resetPlatformTenantCache } from "../services/platformAuth.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    user: { findMany: jest.fn(), count: jest.fn() },
    auditLog: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    module: { findMany: jest.fn(), findFirst: jest.fn() },
    tenantModule: { findUnique: jest.fn(), upsert: jest.fn() },
    tenant: { findFirst: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findMany: jest.Mock; count: jest.Mock };
  auditLog: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
  module: { findMany: jest.Mock; findFirst: jest.Mock };
  tenantModule: { findUnique: jest.Mock; upsert: jest.Mock };
  tenant: { findFirst: jest.Mock };
};

beforeEach(() => {
  __resetPlatformTenantCache();
});

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("platform.controller", () => {
  it("getUsersForTenant responds 400 for a non-numeric tenant id", async () => {
    const req = { params: { id: "abc" }, query: {} } as unknown as Request;
    const res = mockRes();

    await platformController.getUsersForTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("getUsersForTenant scopes the lookup to the requested tenant, not the caller's own", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.user.count.mockResolvedValue(0);
    const req = { params: { id: "42" }, query: {} } as unknown as Request;
    const res = mockRes();

    await platformController.getUsersForTenant(req, res);

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 42n }) }),
    );
  });

  it("getAuditLogs returns a paginated list", async () => {
    mockedPrisma.auditLog.findMany.mockResolvedValue([]);
    mockedPrisma.auditLog.count.mockResolvedValue(0);
    const req = { query: {} } as unknown as Request;
    const res = mockRes();

    await platformController.getAuditLogs(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ pagination: expect.objectContaining({ page: 1, pageSize: 20 }) }),
    );
  });

  it("getTenantModules responds 400 for a non-numeric tenant id", async () => {
    const req = { params: { id: "abc" } } as unknown as Request;
    const res = mockRes();

    await platformController.getTenantModules(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.module.findMany).not.toHaveBeenCalled();
  });

  it("getTenantModules returns the tenant's module entitlements", async () => {
    mockedPrisma.module.findMany.mockResolvedValue([
      {
        id: 1n,
        name: "Tenant Management",
        code: "platform_tenants",
        description: null,
        icon: null,
        sortOrder: 0,
        tenantModules: [],
      },
    ]);
    const req = { params: { id: "5" } } as unknown as Request;
    const res = mockRes();

    await platformController.getTenantModules(req, res);

    expect(res.json).toHaveBeenCalledWith({
      data: [expect.objectContaining({ moduleId: 1n, isEnabled: false })],
    });
  });

  it("setTenantModule responds 404 when the module doesn't exist", async () => {
    mockedPrisma.module.findFirst.mockResolvedValue(null);
    const req = {
      params: { id: "5", moduleId: "1" },
      body: { isEnabled: true },
      auth: { userId: 9n, tenantId: 11n, username: "platformadmin" },
    } as unknown as Request;
    const res = mockRes();

    await platformController.setTenantModule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.tenantModule.upsert).not.toHaveBeenCalled();
  });

  it("setTenantModule enables the module and records an audit log entry", async () => {
    mockedPrisma.module.findFirst.mockResolvedValue({
      id: 1n,
      name: "Tenant Management",
      code: "platform_tenants",
      description: null,
      icon: null,
      route: null,
      sortOrder: 0,
      isSystem: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
    });
    mockedPrisma.tenantModule.upsert.mockResolvedValue({
      tenantId: 5n,
      moduleId: 1n,
      isEnabled: true,
      enabledAt: new Date(),
      disabledAt: null,
      module: { name: "Tenant Management", code: "platform_tenants", description: null, icon: null, sortOrder: 0 },
    });
    const req = {
      params: { id: "5", moduleId: "1" },
      body: { isEnabled: true },
      auth: { userId: 9n, tenantId: 11n, username: "platformadmin" },
    } as unknown as Request;
    const res = mockRes();

    await platformController.setTenantModule(req, res);

    expect(mockedPrisma.tenantModule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId_moduleId: { tenantId: 5n, moduleId: 1n } } }),
    );
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "tenant.module.enable", targetId: 1n, tenantId: 5n }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: true }));
  });

  it("setTenantModule responds 403 when enabling a platform-only module for a non-platform tenant", async () => {
    mockedPrisma.module.findFirst.mockResolvedValue({
      id: 1n,
      name: "Tenant Management",
      code: "platform_tenants",
      isPlatformOnly: true,
    });
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 11n }); // the platform tenant
    const req = {
      params: { id: "5", moduleId: "1" }, // target tenant (5) is NOT the platform tenant (11)
      body: { isEnabled: true },
      auth: { userId: 9n, tenantId: 11n, username: "platformadmin" },
    } as unknown as Request;
    const res = mockRes();

    await platformController.setTenantModule(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedPrisma.tenantModule.upsert).not.toHaveBeenCalled();
  });

  it("setTenantModule allows enabling a platform-only module for the platform tenant itself", async () => {
    mockedPrisma.module.findFirst.mockResolvedValue({
      id: 1n,
      name: "Tenant Management",
      code: "platform_tenants",
      isPlatformOnly: true,
    });
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 11n });
    mockedPrisma.tenantModule.upsert.mockResolvedValue({
      tenantId: 11n,
      moduleId: 1n,
      isEnabled: true,
      enabledAt: new Date(),
      disabledAt: null,
      module: { name: "Tenant Management", code: "platform_tenants", description: null, icon: null, sortOrder: 0 },
    });
    const req = {
      params: { id: "11", moduleId: "1" }, // target tenant IS the platform tenant
      body: { isEnabled: true },
      auth: { userId: 9n, tenantId: 11n, username: "platformadmin" },
    } as unknown as Request;
    const res = mockRes();

    await platformController.setTenantModule(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockedPrisma.tenantModule.upsert).toHaveBeenCalled();
  });

  it("setTenantModule allows disabling a platform-only module for a non-platform tenant", async () => {
    mockedPrisma.module.findFirst.mockResolvedValue({
      id: 1n,
      name: "Tenant Management",
      code: "platform_tenants",
      isPlatformOnly: true,
    });
    mockedPrisma.tenantModule.upsert.mockResolvedValue({
      tenantId: 5n,
      moduleId: 1n,
      isEnabled: false,
      enabledAt: new Date(),
      disabledAt: new Date(),
      module: { name: "Tenant Management", code: "platform_tenants", description: null, icon: null, sortOrder: 0 },
    });
    const req = {
      params: { id: "5", moduleId: "1" },
      body: { isEnabled: false },
      auth: { userId: 9n, tenantId: 11n, username: "platformadmin" },
    } as unknown as Request;
    const res = mockRes();

    await platformController.setTenantModule(req, res);

    // Disabling is always safe — no need to even check isPlatformTenant.
    expect(mockedPrisma.tenant.findFirst).not.toHaveBeenCalled();
    expect(mockedPrisma.tenantModule.upsert).toHaveBeenCalled();
  });
});
