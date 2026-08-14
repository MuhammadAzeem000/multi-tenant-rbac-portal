import { prisma } from "../config/prisma";
import * as platformAuthService from "../services/platformAuth.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    tenant: { findFirst: jest.fn() },
    userRole: { count: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  tenant: { findFirst: jest.Mock };
  userRole: { count: jest.Mock };
};

beforeEach(() => {
  platformAuthService.__resetPlatformTenantCache();
  jest.clearAllMocks();
});

describe("getPlatformTenantId", () => {
  it("returns null when no platform tenant exists", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);
    expect(await platformAuthService.getPlatformTenantId()).toBeNull();
  });

  it("returns the platform tenant's id and caches it across calls", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 7n });

    expect(await platformAuthService.getPlatformTenantId()).toBe(7n);
    expect(await platformAuthService.getPlatformTenantId()).toBe(7n);
    expect(mockedPrisma.tenant.findFirst).toHaveBeenCalledTimes(1);
  });

  it("never caches a not-found result", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValueOnce(null);
    expect(await platformAuthService.getPlatformTenantId()).toBeNull();

    mockedPrisma.tenant.findFirst.mockResolvedValueOnce({ id: 9n });
    expect(await platformAuthService.getPlatformTenantId()).toBe(9n);
  });
});

describe("isPlatformTenant", () => {
  it("returns true when the tenantId matches the platform tenant", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 7n });
    expect(await platformAuthService.isPlatformTenant(7n)).toBe(true);
  });

  it("returns false when the tenantId doesn't match", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 7n });
    expect(await platformAuthService.isPlatformTenant(1n)).toBe(false);
  });

  it("returns false when there's no platform tenant at all", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue(null);
    expect(await platformAuthService.isPlatformTenant(1n)).toBe(false);
  });
});

describe("userHasPermission", () => {
  it("returns true when the user holds a role granting the permission", async () => {
    mockedPrisma.userRole.count.mockResolvedValue(1);
    expect(await platformAuthService.userHasPermission(9n, "platform_tenants", "delete")).toBe(true);
    expect(mockedPrisma.userRole.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 9n,
          role: expect.objectContaining({
            rolePermissions: {
              some: {
                permission: expect.objectContaining({
                  module: { code: "platform_tenants" },
                  action: { code: "delete" },
                }),
              },
            },
          }),
        }),
      }),
    );
  });

  it("returns false when no role grants the permission", async () => {
    mockedPrisma.userRole.count.mockResolvedValue(0);
    expect(await platformAuthService.userHasPermission(9n, "platform_tenants", "delete")).toBe(false);
  });
});
