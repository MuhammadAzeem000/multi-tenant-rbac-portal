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
  it("createPermission responds 400 when moduleId/actionId are missing", async () => {
    const req = { body: { tenantId: "1", name: "View users", code: "users.view" } } as unknown as Request;
    const res = mockRes();

    await permissionController.createPermission(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.permission.create).not.toHaveBeenCalled();
  });

  it("getPermissionById responds 404 when the service finds nothing", async () => {
    mockedPrisma.permission.findFirst.mockResolvedValue(null);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await permissionController.getPermissionById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
