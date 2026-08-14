import "../utils/bigint";
import { prisma } from "../config/prisma";
import * as tenantModuleService from "../services/tenantModule.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    module: { findMany: jest.fn() },
    tenantModule: { findUnique: jest.fn(), upsert: jest.fn(), createMany: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  module: { findMany: jest.Mock };
  tenantModule: { findUnique: jest.Mock; upsert: jest.Mock; createMany: jest.Mock };
};

describe("tenantModule.service", () => {
  describe("getModulesForTenant", () => {
    it("defaults a module with no entitlement row to disabled", async () => {
      mockedPrisma.module.findMany.mockResolvedValue([
        {
          id: 1n,
          name: "Tenant Management",
          code: "platform_tenants",
          description: null,
          icon: null,
          sortOrder: 0,
          tenantModules: [],
        },
      ]);

      const result = await tenantModuleService.getModulesForTenant(5n);

      expect(result).toEqual([
        {
          moduleId: 1n,
          name: "Tenant Management",
          code: "platform_tenants",
          description: null,
          icon: null,
          sortOrder: 0,
          isEnabled: false,
          enabledAt: null,
          disabledAt: null,
        },
      ]);
      expect(mockedPrisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ tenantModules: { where: { tenantId: 5n }, select: expect.anything() } }),
        }),
      );
    });

    it("reflects an existing entitlement row's status", async () => {
      const enabledAt = new Date("2026-01-01");
      mockedPrisma.module.findMany.mockResolvedValue([
        {
          id: 2n,
          name: "Users",
          code: "users",
          description: null,
          icon: null,
          sortOrder: 1,
          tenantModules: [{ isEnabled: true, enabledAt, disabledAt: null }],
        },
      ]);

      const result = await tenantModuleService.getModulesForTenant(5n);

      expect(result[0]).toEqual(
        expect.objectContaining({ moduleId: 2n, isEnabled: true, enabledAt, disabledAt: null }),
      );
    });
  });

  describe("isModuleEnabledForTenant", () => {
    it("returns false when no entitlement row exists", async () => {
      mockedPrisma.tenantModule.findUnique.mockResolvedValue(null);
      expect(await tenantModuleService.isModuleEnabledForTenant(5n, 1n)).toBe(false);
    });

    it("returns the row's isEnabled value when it exists", async () => {
      mockedPrisma.tenantModule.findUnique.mockResolvedValue({ isEnabled: true });
      expect(await tenantModuleService.isModuleEnabledForTenant(5n, 1n)).toBe(true);
    });
  });

  describe("setModuleEnabled", () => {
    it("enables a module and clears disabledAt", async () => {
      mockedPrisma.tenantModule.upsert.mockResolvedValue({
        tenantId: 5n,
        moduleId: 1n,
        isEnabled: true,
        enabledAt: new Date("2026-01-01"),
        disabledAt: null,
        module: { name: "Tenant Management", code: "platform_tenants", description: null, icon: null, sortOrder: 0 },
      });

      await tenantModuleService.setModuleEnabled(5n, 1n, true, 9n);

      expect(mockedPrisma.tenantModule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_moduleId: { tenantId: 5n, moduleId: 1n } },
          create: expect.objectContaining({ tenantId: 5n, moduleId: 1n, isEnabled: true, createdBy: 9n }),
          update: expect.objectContaining({ isEnabled: true, disabledAt: null }),
        }),
      );
    });

    it("disables a module and sets disabledAt without touching createdBy", async () => {
      mockedPrisma.tenantModule.upsert.mockResolvedValue({
        tenantId: 5n,
        moduleId: 1n,
        isEnabled: false,
        enabledAt: new Date("2026-01-01"),
        disabledAt: new Date("2026-01-02"),
        module: { name: "Tenant Management", code: "platform_tenants", description: null, icon: null, sortOrder: 0 },
      });

      const result = await tenantModuleService.setModuleEnabled(5n, 1n, false, 9n);

      expect(mockedPrisma.tenantModule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { isEnabled: false, disabledAt: expect.any(Date) },
        }),
      );
      expect(result.isEnabled).toBe(false);
    });
  });

  describe("grantStandardModuleAccess", () => {
    it("only queries non-platform-only modules", async () => {
      mockedPrisma.module.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);
      mockedPrisma.tenantModule.createMany.mockResolvedValue({ count: 2 });

      await tenantModuleService.grantStandardModuleAccess(5n, 9n);

      expect(mockedPrisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPlatformOnly: false }) }),
      );
      expect(mockedPrisma.tenantModule.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ tenantId: 5n, moduleId: 1n, isEnabled: true, createdBy: 9n }),
          expect.objectContaining({ tenantId: 5n, moduleId: 2n, isEnabled: true, createdBy: 9n }),
        ],
        skipDuplicates: true,
      });
    });

    it("does nothing when there are no standard modules", async () => {
      mockedPrisma.module.findMany.mockResolvedValue([]);

      await tenantModuleService.grantStandardModuleAccess(5n);

      expect(mockedPrisma.tenantModule.createMany).not.toHaveBeenCalled();
    });
  });
});
