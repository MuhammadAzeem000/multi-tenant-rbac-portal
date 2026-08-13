import "../utils/bigint";
import { Request, Response } from "express";
import * as tenantController from "../controllers/tenant.controller";
import { prisma } from "../config/prisma";
import * as tenantService from "../services/tenant.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    tenant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
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
};

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

  it("getTenantById returns null when not found", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);
    expect(await tenantService.getTenantById(1n)).toBeNull();
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
  it("createTenant responds 400 when slug is missing", async () => {
    const req = { body: { name: "Acme" } } as unknown as Request;
    const res = mockRes();

    await tenantController.createTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.tenant.create).not.toHaveBeenCalled();
  });

  it("getTenantById responds 404 when the service finds nothing", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await tenantController.getTenantById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
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
});
