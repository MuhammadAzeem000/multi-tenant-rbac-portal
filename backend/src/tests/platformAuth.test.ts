import { prisma } from "../config/prisma";
import * as platformAuthService from "../services/platformAuth.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    tenant: { findFirst: jest.fn() },
    userRole: { count: jest.fn() },
    tenantModule: { count: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  tenant: { findFirst: jest.Mock };
  userRole: { count: jest.Mock };
  tenantModule: { count: jest.Mock };
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

describe("userHasPermission", () => {
  it("returns true when the user holds a role granting the permission", async () => {
    mockedPrisma.userRole.count.mockResolvedValue(1);
    expect(await platformAuthService.userHasPermission(9n, "Tenants", "Delete")).toBe(true);
    expect(mockedPrisma.userRole.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 9n,
          role: expect.objectContaining({
            rolePermissions: {
              some: {
                permission: expect.objectContaining({
                  module: { name: "Tenants" },
                  action: { name: "Delete" },
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
    expect(await platformAuthService.userHasPermission(9n, "Tenants", "Delete")).toBe(false);
  });
});

describe("tenantCanUseModule", () => {
  it("returns true when the tenant has the module enabled", async () => {
    mockedPrisma.tenantModule.count.mockResolvedValue(1);
    expect(await platformAuthService.tenantCanUseModule(5n, "Tenants")).toBe(true);
    expect(mockedPrisma.tenantModule.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 5n, isEnabled: true, module: expect.objectContaining({ name: "Tenants" }) }),
      }),
    );
  });

  it("returns false when the tenant doesn't have the module enabled", async () => {
    mockedPrisma.tenantModule.count.mockResolvedValue(0);
    expect(await platformAuthService.tenantCanUseModule(5n, "Tenants")).toBe(false);
  });
});

describe("hasModulePermission", () => {
  it("returns false without checking permissions when the module isn't enabled for the tenant", async () => {
    mockedPrisma.tenantModule.count.mockResolvedValue(0);
    expect(await platformAuthService.hasModulePermission(5n, 9n, "Tenants", "Delete")).toBe(false);
    expect(mockedPrisma.userRole.count).not.toHaveBeenCalled();
  });

  it("returns false when the module is enabled but the user lacks the permission", async () => {
    mockedPrisma.tenantModule.count.mockResolvedValue(1);
    mockedPrisma.userRole.count.mockResolvedValue(0);
    expect(await platformAuthService.hasModulePermission(5n, 9n, "Tenants", "Delete")).toBe(false);
  });

  it("returns true when the module is enabled and the user holds the permission", async () => {
    mockedPrisma.tenantModule.count.mockResolvedValue(1);
    mockedPrisma.userRole.count.mockResolvedValue(1);
    expect(await platformAuthService.hasModulePermission(5n, 9n, "Tenants", "Delete")).toBe(true);
  });
});
