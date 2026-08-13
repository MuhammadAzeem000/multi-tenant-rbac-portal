import "../utils/bigint";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import * as authService from "../services/auth.service";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";

jest.mock("../config/prisma", () => ({
  prisma: {
    tenant: { findFirst: jest.fn() },
    user: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

const mockedPrisma = prisma as unknown as {
  tenant: { findFirst: jest.Mock };
  user: { findFirst: jest.Mock; update: jest.Mock };
};
const mockedBcryptCompare = bcrypt.compare as jest.Mock;

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

const loginInput = { tenantSlug: "acme", identifier: "alice", password: "supersecret" };

describe("auth.service login", () => {
  it("returns null when the tenant does not exist", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);

    const result = await authService.login(loginInput, "127.0.0.1");

    expect(result).toBeNull();
    expect(mockedPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when no matching active user is found", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 1n });
    mockedPrisma.user.findFirst.mockResolvedValue(null);

    const result = await authService.login(loginInput, "127.0.0.1");

    expect(result).toBeNull();
  });

  it("returns null when the password does not match", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 1n });
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 1n,
      tenantId: 1n,
      username: "alice",
      isActive: true,
      passwordHash: "hashed",
    });
    mockedBcryptCompare.mockResolvedValue(false);

    const result = await authService.login(loginInput, "127.0.0.1");

    expect(result).toBeNull();
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it("issues tokens and records the login on success", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 1n });
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 1n,
      tenantId: 1n,
      username: "alice",
      email: "alice@example.com",
      isActive: true,
      passwordHash: "hashed",
    });
    mockedBcryptCompare.mockResolvedValue(true);
    mockedPrisma.user.update.mockResolvedValue({});

    const result = await authService.login(loginInput, "127.0.0.1");

    expect(result).not.toBeNull();
    expect(result?.tokens.tokenType).toBe("Bearer");
    expect(typeof result?.tokens.accessToken).toBe("string");
    expect(typeof result?.tokens.refreshToken).toBe("string");
    expect(result?.user).not.toHaveProperty("passwordHash");
    expect(mockedPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ lastLoginAt: expect.any(Date), lastLoginIp: "127.0.0.1" }),
      }),
    );

    const decoded = jwt.verify(result!.tokens.accessToken, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    expect(decoded.sub).toBe("1");
    expect(decoded.tenantId).toBe("1");
    expect(decoded.type).toBe("access");
  });
});

describe("auth.service refreshAccessToken", () => {
  it("returns null for a garbage token", async () => {
    const result = await authService.refreshAccessToken("not-a-real-token");
    expect(result).toBeNull();
  });

  it("returns null when the access secret is used instead of the refresh secret", async () => {
    const token = jwt.sign({ sub: "1", tenantId: "1", type: "refresh" }, env.JWT_ACCESS_SECRET);
    const result = await authService.refreshAccessToken(token);
    expect(result).toBeNull();
  });

  it("issues a fresh access token and echoes the same refresh token", async () => {
    const refreshToken = jwt.sign({ sub: "1", tenantId: "1", type: "refresh" }, env.JWT_REFRESH_SECRET);
    mockedPrisma.user.findFirst.mockResolvedValue({ id: 1n, tenantId: 1n, username: "alice" });

    const tokens = await authService.refreshAccessToken(refreshToken);

    expect(tokens).not.toBeNull();
    expect(tokens?.refreshToken).toBe(refreshToken);
    expect(typeof tokens?.accessToken).toBe("string");
  });

  it("returns null when the user behind the token no longer exists", async () => {
    const refreshToken = jwt.sign({ sub: "1", tenantId: "1", type: "refresh" }, env.JWT_REFRESH_SECRET);
    mockedPrisma.user.findFirst.mockResolvedValue(null);

    const tokens = await authService.refreshAccessToken(refreshToken);

    expect(tokens).toBeNull();
  });
});

describe("auth.controller", () => {
  it("login responds 400 on malformed input", async () => {
    const req = { body: { tenantSlug: "acme" } } as unknown as Request;
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("login responds 401 when credentials are rejected", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);
    const req = { body: loginInput, ip: "127.0.0.1" } as unknown as Request;
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("refresh responds 401 for an invalid refresh token", async () => {
    const req = { body: { refreshToken: "bad" } } as unknown as Request;
    const res = mockRes();

    await authController.refresh(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("authenticate middleware", () => {
  function mockNext() {
    return jest.fn();
  }

  it("rejects requests without an Authorization header", () => {
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a refresh token presented as an access token", () => {
    const token = jwt.sign({ sub: "1", tenantId: "1", type: "refresh" }, env.JWT_ACCESS_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches auth context and calls next for a valid access token", () => {
    const token = jwt.sign(
      { sub: "42", tenantId: "7", username: "alice", type: "access" },
      env.JWT_ACCESS_SECRET,
    );
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.auth).toEqual({ userId: 42n, tenantId: 7n, username: "alice" });
  });
});
