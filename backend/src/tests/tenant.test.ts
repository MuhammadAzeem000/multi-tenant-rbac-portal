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
      findUnique: jest.fn(),
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
    tenantModule: { createMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  tenant: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
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
  tenantModule: { createMany: jest.Mock; findMany: jest.Mock; count: jest.Mock };
};

function mockNoDependents() {
  mockedPrisma.user.count.mockResolvedValue(0);
  mockedPrisma.role.count.mockResolvedValue(0);
  mockedPrisma.department.count.mockResolvedValue(0);
  mockedPrisma.permission.count.mockResolvedValue(0);
  mockedPrisma.tenant.count.mockResolvedValue(0);
}

beforeEach(() => {
  __resetPlatformTenantCache();
  jest.clearAllMocks();
  mockedPrisma.auditLog.create.mockResolvedValue({ id: 1n });
  mockedPrisma.tenantModule.findMany.mockResolvedValue([]);
  mockedPrisma.tenant.findMany.mockResolvedValue([]);
});

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("tenant.service", () => {
  it("getTenants filters out soft-deleted tenants, scopes to visibleTenantIds, and paginates", async () => {
    mockedPrisma.tenant.findMany.mockResolvedValue([{ id: 1n, name: "Acme" }]);
    mockedPrisma.tenant.count.mockResolvedValue(1);

    const result = await tenantService.getTenants({ page: 1, pageSize: 20, visibleTenantIds: [1n] });

    expect(mockedPrisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, id: { in: [1n] } }, skip: 0, take: 20 }),
    );
    expect(result.data).toEqual([{ id: 1n, name: "Acme" }]);
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });

  it("getTenants computes skip from the page number", async () => {
    mockedPrisma.tenant.findMany.mockResolvedValue([]);
    mockedPrisma.tenant.count.mockResolvedValue(45);

    const result = await tenantService.getTenants({ page: 3, pageSize: 20, visibleTenantIds: [1n] });

    expect(mockedPrisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
    expect(result.pagination.totalPages).toBe(3);
  });

  it("getTenants searches across name/domain and filters by isActive", async () => {
    mockedPrisma.tenant.findMany.mockResolvedValue([]);
    mockedPrisma.tenant.count.mockResolvedValue(0);

    await tenantService.getTenants({ page: 1, pageSize: 20, search: "acme", isActive: true, visibleTenantIds: [1n, 2n] });

    expect(mockedPrisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          id: { in: [1n, 2n] },
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

  it("createTenant stores the given parentTenantId and grants only the parent's currently-enabled modules", async () => {
    mockedPrisma.tenant.create.mockResolvedValue({ id: 5n });
    mockedPrisma.tenantModule.findMany.mockResolvedValue([{ moduleId: 1n }, { moduleId: 2n }]);
    mockedPrisma.tenantModule.createMany.mockResolvedValue({ count: 2 });

    await tenantService.createTenant({ name: "Acme", domain: "acme.test" }, 11n);

    expect(mockedPrisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Acme", domain: "acme.test", parentTenantId: 11n }),
      }),
    );
    expect(mockedPrisma.tenantModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 11n, isEnabled: true } }),
    );
    expect(mockedPrisma.module.findMany).not.toHaveBeenCalled();
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

  it("createTenant grants every active module when parentTenantId is null (the platform tenant)", async () => {
    mockedPrisma.tenant.create.mockResolvedValue({ id: 1n });
    mockedPrisma.module.findMany.mockResolvedValue([{ id: 1n }]);
    mockedPrisma.tenantModule.createMany.mockResolvedValue({ count: 1 });

    await tenantService.createTenant({ name: "Platform", domain: "platform.internal" }, null);

    expect(mockedPrisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentTenantId: null }) }),
    );
    expect(mockedPrisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
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

  it("tenantHasDependents counts child tenants alongside users/roles/departments/permissions", async () => {
    mockNoDependents();
    mockedPrisma.tenant.count.mockResolvedValue(1);

    expect(await tenantService.tenantHasDependents(5n)).toBe(true);
    expect(mockedPrisma.tenant.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentTenantId: 5n, deletedAt: null } }),
    );
  });

  describe("getDescendantTenantIds", () => {
    it("walks the tree breadth-first and includes the root", async () => {
      mockedPrisma.tenant.findMany
        .mockResolvedValueOnce([{ id: 2n }, { id: 3n }]) // children of 1
        .mockResolvedValueOnce([{ id: 4n }]) // children of 2 or 3
        .mockResolvedValueOnce([]); // no more children

      const ids = await tenantService.getDescendantTenantIds(1n);

      expect(ids).toEqual([1n, 2n, 3n, 4n]);
    });

    it("returns just the tenant itself when it has no children", async () => {
      mockedPrisma.tenant.findMany.mockResolvedValueOnce([]);
      expect(await tenantService.getDescendantTenantIds(1n)).toEqual([1n]);
    });
  });

  describe("isAncestorOf", () => {
    it("is true for a tenant checking itself", async () => {
      expect(await tenantService.isAncestorOf(1n, 1n)).toBe(true);
      expect(mockedPrisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it("is true when ancestorId is somewhere up the parent chain", async () => {
      mockedPrisma.tenant.findUnique
        .mockResolvedValueOnce({ parentTenantId: 2n }) // tenant 3's parent
        .mockResolvedValueOnce({ parentTenantId: 1n }); // tenant 2's parent

      expect(await tenantService.isAncestorOf(1n, 3n)).toBe(true);
    });

    it("is false when the chain reaches the root without matching", async () => {
      mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: null });
      expect(await tenantService.isAncestorOf(1n, 2n)).toBe(false);
    });
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

  it("createTenant creates the tenant as a child of the caller's own tenant and records an audit log entry", async () => {
    mockedPrisma.tenant.create.mockResolvedValue({ id: 1n });
    const req = {
      body: { name: "Acme", domain: "acme.com" },
      auth: { userId: 9n, tenantId: 5n, email: "alice@platform.internal" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.createTenant(req, res);

    expect(mockedPrisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentTenantId: 5n }) }),
    );
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

  it("getTenantById responds 404 for a tenant outside the caller's own subtree", async () => {
    const req = {
      params: { id: "2" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    // isAncestorOf(1, 2) walks up from 2 and never reaches 1.
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: null });

    await tenantController.getTenantById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.tenant.findFirst).not.toHaveBeenCalled();
  });

  it("getTenantById proceeds for a descendant tenant when the caller holds view permission", async () => {
    const req = {
      params: { id: "2" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@platform.internal" },
    } as unknown as Request;
    const res = mockRes();

    // isAncestorOf(1, 2): tenant 2's parent is 1.
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: 1n });
    mockedPrisma.tenantModule.count.mockResolvedValue(1);
    mockedPrisma.userRole.count.mockResolvedValue(1);
    mockedPrisma.tenant.findFirst.mockResolvedValueOnce({ id: 2n, name: "Other" });

    await tenantController.getTenantById(req, res);

    expect(res.json).toHaveBeenCalledWith({ id: 2n, name: "Other" });
  });

  it("getTenants scopes results to the caller's own subtree", async () => {
    mockedPrisma.tenant.findMany
      .mockResolvedValueOnce([{ id: 2n }]) // getDescendantTenantIds: children of 1
      .mockResolvedValueOnce([]) // no grandchildren
      .mockResolvedValueOnce([]); // the actual list query
    mockedPrisma.tenant.count.mockResolvedValue(0);
    const req = { query: {}, auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" } } as unknown as Request;
    const res = mockRes();

    await tenantController.getTenants(req, res);

    expect(mockedPrisma.tenant.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: [1n, 2n] } }) }),
    );
  });

  it("getTenants responds 400 for an out-of-range pageSize", async () => {
    const req = { query: { pageSize: "1000" } } as unknown as Request;
    const res = mockRes();

    await tenantController.getTenants(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.tenant.findMany).not.toHaveBeenCalled();
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

  it("updateTenant responds 404 for a tenant outside the caller's own subtree", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: null });
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

  it("setTenantStatus responds 404 for a tenant outside the caller's own subtree", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: null });
    const req = {
      params: { id: "2" },
      body: { isActive: false },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.setTenantStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
  });

  it("setTenantStatus proceeds for a descendant tenant and records an audit log entry", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: 1n });
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

  it("deleteTenant responds 404 for a tenant outside the caller's own subtree", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: null });
    const req = {
      params: { id: "2" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.deleteTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
  });

  it("deleteTenant proceeds when deleting a descendant tenant with no dependents", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: 1n });
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
      mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: 1n });
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

  it("deleteTenant responds 409 when the tenant still has child tenants", async () => {
    mockedPrisma.tenant.findUnique.mockResolvedValueOnce({ parentTenantId: 1n });
    mockNoDependents();
    mockedPrisma.tenant.count.mockResolvedValue(1);

    const req = {
      params: { id: "2" },
      auth: { userId: 9n, tenantId: 1n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await tenantController.deleteTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockedPrisma.tenant.update).not.toHaveBeenCalled();
  });
});
