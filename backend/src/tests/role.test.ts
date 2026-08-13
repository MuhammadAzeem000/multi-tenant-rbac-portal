import "../utils/bigint";
import { Request, Response } from "express";
import * as roleController from "../controllers/role.controller";
import { prisma } from "../config/prisma";
import * as roleService from "../services/role.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    role: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  role: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("role.service", () => {
  it("getRoles scopes by tenantId when provided", async () => {
    mockedPrisma.role.findMany.mockResolvedValue([]);
    await roleService.getRoles(5n);
    expect(mockedPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, tenantId: 5n } }),
    );
  });

  it("deleteRole soft-deletes instead of removing the row", async () => {
    mockedPrisma.role.update.mockResolvedValue({ id: 1n });
    await roleService.deleteRole(1n);
    expect(mockedPrisma.role.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("role.controller", () => {
  it("createRole responds 400 when name is missing", async () => {
    const req = { body: { tenantId: "1" } } as unknown as Request;
    const res = mockRes();

    await roleController.createRole(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.role.create).not.toHaveBeenCalled();
  });

  it("getRoleById responds 404 when the service finds nothing", async () => {
    mockedPrisma.role.findFirst.mockResolvedValue(null);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await roleController.getRoleById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
