import "../utils/bigint";
import { Request, Response } from "express";
import * as moduleController from "../controllers/module.controller";
import { prisma } from "../config/prisma";
import * as moduleService from "../services/module.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    module: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  module: {
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

describe("module.service", () => {
  it("getModules filters out soft-deleted modules", async () => {
    mockedPrisma.module.findMany.mockResolvedValue([]);
    await moduleService.getModules();
    expect(mockedPrisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
  });

  it("deleteModule soft-deletes instead of removing the row", async () => {
    mockedPrisma.module.update.mockResolvedValue({ id: 1n });
    await moduleService.deleteModule(1n);
    expect(mockedPrisma.module.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("module.controller", () => {
  it("createModule responds 400 when code is missing", async () => {
    const req = { body: { name: "Assets" } } as unknown as Request;
    const res = mockRes();

    await moduleController.createModule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.module.create).not.toHaveBeenCalled();
  });

  it("getModuleById responds 404 when the service finds nothing", async () => {
    mockedPrisma.module.findFirst.mockResolvedValue(null);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await moduleController.getModuleById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
