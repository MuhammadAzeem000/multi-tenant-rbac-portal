import "../utils/bigint";
import { Request, Response } from "express";
import * as permissionController from "../controllers/permission.controller";
import { prisma } from "../config/prisma";
import * as permissionService from "../services/permission.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    permission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    rolePermission: {
      count: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  permission: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  rolePermission: {
    count: jest.Mock;
  };
};

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("permission.service", () => {
  it("getPermissions scopes by tenantId when provided", async () => {
    mockedPrisma.permission.findMany.mockResolvedValue([]);
    mockedPrisma.permission.count.mockResolvedValue(0);

    await permissionService.getPermissions({ tenantId: 5n, page: 1, pageSize: 20 });

    expect(mockedPrisma.permission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, tenantId: 5n }, skip: 0, take: 20 }),
    );
  });

  it("getPermissions computes skip from the page number", async () => {
    mockedPrisma.permission.findMany.mockResolvedValue([]);
    mockedPrisma.permission.count.mockResolvedValue(45);

    const result = await permissionService.getPermissions({ page: 3, pageSize: 20 });

    expect(mockedPrisma.permission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
    expect(result.pagination.totalPages).toBe(3);
  });

  it("deletePermission soft-deletes instead of removing the row", async () => {
    mockedPrisma.permission.update.mockResolvedValue({ id: 1n });
    await permissionService.deletePermission(1n);
    expect(mockedPrisma.permission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("permission.controller", () => {
  it("getPermissions ignores a cross-tenant tenantId query param and always scopes to the caller's own tenant", async () => {
    mockedPrisma.permission.findMany.mockResolvedValue([]);
    mockedPrisma.permission.count.mockResolvedValue(0);
    const req = {
      query: { tenantId: "999" },
      auth: { userId: 1n, tenantId: 5n, username: "alice" },
    } as unknown as Request;
    const res = mockRes();

    await permissionController.getPermissions(req, res);

    expect(mockedPrisma.permission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 5n }) }),
    );
  });

  it("createPermission responds 400 when moduleId/actionId are missing", async () => {
    const req = { body: { tenantId: "1", name: "View users", code: "users.view" } } as unknown as Request;
    const res = mockRes();

    await permissionController.createPermission(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.permission.create).not.toHaveBeenCalled();
  });

  it("createPermission ignores a cross-tenant tenantId in the body and always uses the caller's own tenant", async () => {
    mockedPrisma.permission.create.mockResolvedValue({ id: 1n });
    const req = {
      body: { tenantId: "999", moduleId: "1", actionId: "1", name: "View users", code: "users.view" },
      auth: { userId: 1n, tenantId: 5n, username: "alice" },
    } as unknown as Request;
    const res = mockRes();

    await permissionController.createPermission(req, res);

    const dataArg = mockedPrisma.permission.create.mock.calls[0][0].data;
    expect(dataArg.tenantId).toBe(5n);
  });

  it("getPermissionById responds 404 when the service finds nothing", async () => {
    mockedPrisma.permission.findFirst.mockResolvedValue(null);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await permissionController.getPermissionById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deletePermission responds 409 when the permission is still assigned to a role", async () => {
    mockedPrisma.rolePermission.count.mockResolvedValue(1);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await permissionController.deletePermission(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockedPrisma.permission.update).not.toHaveBeenCalled();
  });

  it("deletePermission proceeds when the permission isn't assigned to any role", async () => {
    mockedPrisma.rolePermission.count.mockResolvedValue(0);
    mockedPrisma.permission.update.mockResolvedValue({ id: 1n });
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await permissionController.deletePermission(req, res);

    expect(mockedPrisma.permission.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1n } }));
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
