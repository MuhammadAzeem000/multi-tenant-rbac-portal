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
      count: jest.fn(),
    },
    userDepartment: {
      findFirst: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  department: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  userDepartment: {
    findFirst: jest.Mock;
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
    mockedPrisma.department.count.mockResolvedValue(0);

    await departmentService.getDepartments({ tenantId: 5n, page: 1, pageSize: 20 });

    expect(mockedPrisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, tenantId: 5n }, skip: 0, take: 20 }),
    );
  });

  it("getDepartments computes skip from the page number", async () => {
    mockedPrisma.department.findMany.mockResolvedValue([]);
    mockedPrisma.department.count.mockResolvedValue(45);

    const result = await departmentService.getDepartments({ page: 3, pageSize: 20 });

    expect(mockedPrisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
    expect(result.pagination.totalPages).toBe(3);
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

  it("deleteDepartment responds 409 when you belong to the department", async () => {
    mockedPrisma.userDepartment.findFirst.mockResolvedValue({ userId: 9n });
    const req = {
      params: { id: "1" },
      auth: { userId: 9n, tenantId: 5n, username: "alice" },
    } as unknown as Request;
    const res = mockRes();

    await departmentController.deleteDepartment(req, res);

    expect(mockedPrisma.userDepartment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 9n, departmentId: 1n } }),
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockedPrisma.department.update).not.toHaveBeenCalled();
  });

  it("deleteDepartment proceeds when you don't belong to the department", async () => {
    mockedPrisma.userDepartment.findFirst.mockResolvedValue(null);
    mockedPrisma.department.update.mockResolvedValue({ id: 1n });
    const req = {
      params: { id: "1" },
      auth: { userId: 9n, tenantId: 5n, username: "alice" },
    } as unknown as Request;
    const res = mockRes();

    await departmentController.deleteDepartment(req, res);

    expect(mockedPrisma.department.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1n } }),
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
