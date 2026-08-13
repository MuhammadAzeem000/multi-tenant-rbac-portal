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
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: {
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

describe("user.service", () => {
  it("getUsers filters out soft-deleted users", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([{ id: 1n, name: "Alice" }]);
    const users = await userService.getUsers();
    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
    expect(users).toEqual([{ id: 1n, name: "Alice" }]);
  });

  it("getUsers scopes by tenantId when provided", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([]);
    await userService.getUsers(5n);
    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, tenantId: 5n } }),
    );
  });

  it("getUserById returns null when not found", async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);
    const user = await userService.getUserById(1n);
    expect(user).toBeNull();
  });

  it("createUser hashes the password instead of storing it raw", async () => {
    mockedPrisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 1n, ...data }),
    );

    await userService.createUser({
      tenantId: 1n,
      name: "Alice",
      username: "alice",
      email: "alice@example.com",
      password: "supersecret",
    });

    const dataArg = mockedPrisma.user.create.mock.calls[0][0].data;
    expect(dataArg.passwordHash).toBeDefined();
    expect(dataArg.passwordHash).not.toBe("supersecret");
    expect(dataArg).not.toHaveProperty("password");
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
});
