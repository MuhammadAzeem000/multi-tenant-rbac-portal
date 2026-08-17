import "../utils/bigint";
import { Request, Response } from "express";
import * as userController from "../controllers/user.controller";
import { prisma } from "../config/prisma";
import * as userService from "../services/user.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tenant: {
      findUniqueOrThrow: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  tenant: {
    findUniqueOrThrow: jest.Mock;
  };
};

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("user.service", () => {
  it("getUsers filters out soft-deleted users and paginates", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([{ id: 1n, name: "Alice" }]);
    mockedPrisma.user.count.mockResolvedValue(1);

    const result = await userService.getUsers({ page: 1, pageSize: 20 });

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null }, skip: 0, take: 20 }),
    );
    expect(result.data).toEqual([{ id: 1n, name: "Alice" }]);
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });

  it("getUsers scopes by tenantId when provided", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.user.count.mockResolvedValue(0);

    await userService.getUsers({ tenantId: 5n, page: 1, pageSize: 20 });

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, tenantId: 5n } }),
    );
  });

  it("getUsers searches across name/email and filters by isActive", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.user.count.mockResolvedValue(0);

    await userService.getUsers({ page: 1, pageSize: 20, search: "alice", isActive: false });

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          isActive: false,
          OR: [
            { name: { contains: "alice", mode: "insensitive" } },
            { email: { contains: "alice", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("getUsers computes skip from the page number", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.user.count.mockResolvedValue(45);

    const result = await userService.getUsers({ page: 3, pageSize: 20 });

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
    expect(result.pagination.totalPages).toBe(3);
  });

  it("getUserById returns null when not found", async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);
    const user = await userService.getUserById(1n);
    expect(user).toBeNull();
  });

  it("createUser hashes the password and builds the email from the tenant's domain", async () => {
    mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ domain: "example.com" });
    mockedPrisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 1n, ...data }),
    );

    await userService.createUser({
      tenantId: 1n,
      name: "Alice",
      emailLocalPart: "alice",
      password: "supersecret",
    });

    expect(mockedPrisma.tenant.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1n } }),
    );
    const dataArg = mockedPrisma.user.create.mock.calls[0][0].data;
    expect(dataArg.email).toBe("alice@example.com");
    expect(dataArg.passwordHash).toBeDefined();
    expect(dataArg.passwordHash).not.toBe("supersecret");
    expect(dataArg).not.toHaveProperty("password");
    expect(dataArg).not.toHaveProperty("emailLocalPart");
  });

  it("updateUser recomputes the email from the tenant's domain when emailLocalPart changes", async () => {
    mockedPrisma.user.findUniqueOrThrow.mockResolvedValue({ tenant: { domain: "example.com" } });
    mockedPrisma.user.update.mockResolvedValue({ id: 1n });

    await userService.updateUser(1n, { emailLocalPart: "newname" });

    expect(mockedPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ email: "newname@example.com" }),
      }),
    );
    const dataArg = mockedPrisma.user.update.mock.calls[0][0].data;
    expect(dataArg).not.toHaveProperty("emailLocalPart");
  });

  it("updateUser leaves the email untouched when emailLocalPart is not provided", async () => {
    mockedPrisma.user.update.mockResolvedValue({ id: 1n });

    await userService.updateUser(1n, { name: "Alice Updated" });

    expect(mockedPrisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mockedPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ email: expect.anything() }) }),
    );
  });

  it("deleteUser soft-deletes instead of removing the row", async () => {
    mockedPrisma.user.update.mockResolvedValue({ id: 1n });
    await userService.deleteUser(1n);
    expect(mockedPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("user.controller", () => {
  it("getUsers ignores a cross-tenant tenantId query param and always scopes to the caller's own tenant", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.user.count.mockResolvedValue(0);
    const req = {
      query: { tenantId: "999" },
      auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await userController.getUsers(req, res);

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 5n }) }),
    );
  });

  it("createUser ignores a cross-tenant tenantId in the body and always uses the caller's own tenant", async () => {
    mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ domain: "example.com" });
    mockedPrisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 1n, ...data }),
    );
    const req = {
      body: { tenantId: "999", name: "Bob", emailLocalPart: "bob", password: "supersecret" },
      auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await userController.createUser(req, res);

    const dataArg = mockedPrisma.user.create.mock.calls[0][0].data;
    expect(dataArg.tenantId).toBe(5n);
  });

  it("getUserById responds 400 for a non-numeric id", async () => {
    const req = { params: { id: "abc" } } as unknown as Request;
    const res = mockRes();

    await userController.getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("getUserById responds 404 when the service finds nothing", async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);
    const req = { params: { id: "1" } } as unknown as Request;
    const res = mockRes();

    await userController.getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("createUser responds 400 with validation errors for bad input", async () => {
    const req = { body: { name: "Alice" } } as unknown as Request;
    const res = mockRes();

    await userController.createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it("updateUser responds 409 when changing your own active status", async () => {
    const req = {
      params: { id: "1" },
      body: { isActive: false },
      auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it("updateUser allows editing your own other fields", async () => {
    mockedPrisma.user.update.mockResolvedValue({ id: 1n });
    const req = {
      params: { id: "1" },
      body: { name: "Alice Updated" },
      auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await userController.updateUser(req, res);

    expect(mockedPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1n } }));
    expect(res.json).toHaveBeenCalled();
  });

  it("updateUser proceeds when changing a different user's active status", async () => {
    mockedPrisma.user.update.mockResolvedValue({ id: 2n });
    const req = {
      params: { id: "2" },
      body: { isActive: false },
      auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await userController.updateUser(req, res);

    expect(mockedPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2n } }));
    expect(res.json).toHaveBeenCalled();
  });

  it("deleteUser responds 409 when deleting your own account", async () => {
    const req = {
      params: { id: "1" },
      auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await userController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it("deleteUser proceeds when deleting a different user", async () => {
    mockedPrisma.user.update.mockResolvedValue({ id: 2n });
    const req = {
      params: { id: "2" },
      auth: { userId: 1n, tenantId: 5n, email: "alice@acme.test" },
    } as unknown as Request;
    const res = mockRes();

    await userController.deleteUser(req, res);

    expect(mockedPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2n } }));
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
