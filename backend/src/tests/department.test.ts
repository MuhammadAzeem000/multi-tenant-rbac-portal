import "../utils/bigint";
import { Request, Response } from "express";
import * as departmentController from "../controllers/department.controller";
import { prisma } from "../config/prisma";
import * as departmentService from "../services/department.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    department: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  department: {
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

describe("department.service", () => {
  it("getDepartments scopes by tenantId when provided", async () => {
    mockedPrisma.department.findMany.mockResolvedValue([]);
    await departmentService.getDepartments(5n);
    expect(mockedPrisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, tenantId: 5n } }),
    );
  });

  it("deleteDepartment soft-deletes instead of removing the row", async () => {
    mockedPrisma.department.update.mockResolvedValue({ id: 1n });
    await departmentService.deleteDepartment(1n);
    expect(mockedPrisma.department.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("department.controller", () => {
  it("createDepartment responds 400 when tenantId is missing", async () => {
    const req = { body: { name: "Engineering" } } as unknown as Request;
    const res = mockRes();

    await departmentController.createDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.department.create).not.toHaveBeenCalled();
  });

  it("getDepartmentById responds 404 when the service finds nothing", async () => {
    mockedPrisma.department.findFirst.mockResolvedValue(null);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await departmentController.getDepartmentById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
