import "../utils/bigint";
import { Request, Response } from "express";
import * as tenantController from "../controllers/tenant.controller";
import { prisma } from "../config/prisma";
import * as tenantService from "../services/tenant.service";
import { __resetPlatformTenantCache } from "../services/platformAuth.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    tenant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: { count: jest.fn() },
    role: { count: jest.fn() },
    department: { count: jest.fn() },
    permission: { count: jest.fn() },
    userRole: { count: jest.fn() },
    auditLog: { create: jest.fn() },
    module: { findMany: jest.fn() },
    tenantModule: { createMany: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  tenant: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  user: { count: jest.Mock };
  role: { count: jest.Mock };
  department: { count: jest.Mock };
  permission: { count: jest.Mock };
  userRole: { count: jest.Mock };
  auditLog: { create: jest.Mock };
  module: { findMany: jest.Mock };
  tenantModule: { createMany: jest.Mock };
};

function mockNoDependents() {
  mockedPrisma.user.count.mockResolvedValue(0);
  mockedPrisma.role.count.mockResolvedValue(0);
  mockedPrisma.department.count.mockResolvedValue(0);
  mockedPrisma.permission.count.mockResolvedValue(0);
}

beforeEach(() => {
  __resetPlatformTenantCache();
  mockedPrisma.auditLog.create.mockResolvedValue({ id: 1n });
});

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("tenant.service", () => {
  it("getTenants filters out soft-deleted tenants and paginates", async () => {
    mockedPrisma.tenant.findMany.mockResolvedValue([{ id: 1n, name: "Acme" }]);
    mockedPrisma.tenant.count.mockResolvedValue(1);

    const result = await tenantService.getTenants({ page: 1, pageSize: 20 });

    expect(mockedPrisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null }, skip: 0, take: 20 }),
    );
    expect(result.data).toEqual([{ id: 1n, name: "Acme" }]);
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });

  it("getTenants computes skip from the page number", async () => {
    mockedPrisma.tenant.findMany.mockResolvedValue([]);
    mockedPrisma.tenant.count.mockResolvedValue(45);

    const result = await tenantService.getTenants({ page: 3, pageSize: 20 });

    expect(mockedPrisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
    expect(result.pagination.totalPages).toBe(3);
  });

  it("getTenants searches across name/domain and filters by isActive", async () => {
    mockedPrisma.tenant.findMany.mockResolvedValue([]);
    mockedPrisma.tenant.count.mockResolvedValue(0);

    await tenantService.getTenants({ page: 1, pageSize: 20, search: "acme", isActive: true });

    expect(mockedPrisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { name: { contains: "acme", mode: "insensitive" } },
            { domain: { contains: "acme", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("getTenantById returns null when not found", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);
    expect(await tenantService.getTenantById(1n)).toBeNull();
  });

  it("createTenant grants standard module access to every newly created tenant", async () => {
    mockedPrisma.tenant.create.mockResolvedValue({ id: 5n });
    mockedPrisma.module.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);
    mockedPrisma.tenantModule.createMany.mockResolvedValue({ count: 2 });

    await tenantService.createTenant({ name: "Acme", domain: "acme.test" });

    expect(mockedPrisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Acme", domain: "acme.test" }) }),
    );
    expect(mockedPrisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
    expect(mockedPrisma.tenantModule.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ tenantId: 5n, moduleId: 1n, isEnabled: true }),
          expect.objectContaining({ tenantId: 5n, moduleId: 2n, isEnabled: true }),
        ],
        skipDuplicates: true,
      }),
    );
  });

  it("deleteTenant soft-deletes instead of removing the row", async () => {
    mockedPrisma.tenant.update.mockResolvedValue({ id: 1n });
    await tenantService.deleteTenant(1n);
    expect(mockedPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("tenant.controller", () => {
  it("createTenant responds 400 when domain is missing", async () => {
    const req = { body: { name: "Acme" } } as unknown as Request;
    const res = mockRes();

    await tenantController.createTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.tenant.create).not.toHaveBeenCalled();
  });

  it("createTenant creates the tenant and records an audit log entry", async () => {
    mockedPrisma.tenant.create.mockResolvedValue({ id: 1n });
    const req = {
      body: { name: "Acme", domain: "acme.com" },
      auth: { userId: 9n, tenantId: 5n, email: "alice@platform.internal" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.createTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "tenant.create" }) }),
    );
  });

  it("createTenant rejects a malformed domain", async () => {
    const req = {
      body: { name: "Acme", domain: "not a domain" },
      auth: { userId: 9n, tenantId: 5n, email: "alice@platform.internal" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.createTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.tenant.create).not.toHaveBeenCalled();
  });

  it("getTenantById responds 404 when the service finds nothing (self access)", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);
    const req = {
      params: { id: "1" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.getTenantById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getTenantById responds 404 for a different tenant when the caller isn't a platform admin", async () => {
    const req = {
      params: { id: "2" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    // isPlatformTenant's lookup resolves to no platform tenant at all.
    mockedPrisma.tenant.findFirst.mockResolvedValueOnce(null);

    await tenantController.getTenantById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.tenant.findFirst).toHaveBeenCalledTimes(1);
  });

  it("getTenantById proceeds for a different tenant when the caller is a platform admin with view permission", async () => {
    const req = {
      params: { id: "2" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@platform.internal" },
    } as unknown as Request;
    const res = mockRes();

    // First findFirst call is isPlatformTenant's platform-tenant lookup; second is the actual tenant fetch.
    mockedPrisma.tenant.findFirst.mockResolvedValueOnce({ id: 1n });
    mockedPrisma.userRole.count.mockResolvedValue(1);
    mockedPrisma.tenant.findFirst.mockResolvedValueOnce({ id: 2n, name: "Other" });

    await tenantController.getTenantById(req, res);

    expect(res.json).toHaveBeenCalledWith({ id: 2n, name: "Other" });
  });

  it("getTenants responds 400 for an out-of-range pageSize", async () => {
    const req = { query: { pageSize: "1000" } } as unknown as Request;
    const res = mockRes();

    await tenantController.getTenants(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.tenant.findMany).not.toHaveBeenCalled();
  });

  it("getTenants defaults to page 1 / pageSize 20", async () => {
    mockedPrisma.tenant.findMany.mockResolvedValue([]);
    mockedPrisma.tenant.count.mockResolvedValue(0);
    const req = { query: {} } as unknown as Request;
    const res = mockRes();

    await tenantController.getTenants(req, res);

    expect(mockedPrisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("updateTenant rejects isActive changes, even for your own tenant", async () => {
    const req = {
      params: { id: "1" },
      body: { isActive: false },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.updateTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
  });

  it("updateTenant responds 404 for a different tenant when the caller isn't a platform admin", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValueOnce(null);
    const req = {
      params: { id: "2" },
      body: { name: "New name" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.updateTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
  });

  it("updateTenant proceeds for your own tenant when not touching isActive", async () => {
    mockedPrisma.tenant.update.mockResolvedValue({ id: 1n });
    const req = {
      params: { id: "1" },
      body: { name: "New name" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.updateTenant(req, res);

    expect(mockedPrisma.tenant.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1n } }));
    expect(res.json).toHaveBeenCalled();
  });

  it("setTenantStatus responds 409 when changing the active status of the tenant you're logged into", async () => {
    const req = {
      params: { id: "1" },
      body: { isActive: false },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.setTenantStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
  });

  it("setTenantStatus proceeds for a different tenant and records an audit log entry", async () => {
    mockedPrisma.tenant.update.mockResolvedValue({ id: 2n, isActive: false, status: "suspended" });
    const req = {
      params: { id: "2" },
      body: { isActive: false },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.setTenantStatus(req, res);

    expect(mockedPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2n }, data: { isActive: false, status: "suspended" } }),
    );
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "tenant.suspend", targetId: 2n }) }),
    );
    expect(res.json).toHaveBeenCalled();
  });

  it("deleteTenant responds 409 when deleting the tenant you're logged into", async () => {
    const req = {
      params: { id: "1" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.deleteTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
  });

  it("deleteTenant proceeds when deleting a different tenant with no dependents", async () => {
    mockNoDependents();
    mockedPrisma.tenant.update.mockResolvedValue({ id: 2n });
    const req = {
      params: { id: "2" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.deleteTenant(req, res);

    expect(mockedPrisma.tenant.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2n } }));
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it.each(["user", "role", "department", "permission"] as const)(
    "deleteTenant responds 409 when the tenant still has %ss",
    async (dependent) => {
      mockNoDependents();
      mockedPrisma[dependent].count.mockResolvedValue(1);

      const req = {
        params: { id: "2" },
        auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
      } as unknown as Request;
      const res = mockRes();

      await tenantController.deleteTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
    },
  );
});
