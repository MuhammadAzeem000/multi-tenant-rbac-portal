import "../utils/bigint";
import { prisma } from "../config/prisma";
import * as tenantModuleService from "../services/tenantModule.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    module: { findMany: jest.fn() },
    tenant: { findUniqueOrThrow: jest.fn() },
    tenantModule: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), createMany: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  module: { findMany: jest.Mock };
  tenant: { findUniqueOrThrow: jest.Mock };
  tenantModule: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock; createMany: jest.Mock };
};

describe("tenantModule.service", () => {
  describe("getModulesForTenant", () => {
    it("defaults a module with no entitlement row to disabled, and marks it available when there's no parent", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: null });
      mockedPrisma.module.findMany.mockResolvedValue([
        {
          id: 1n,
          name: "Tenant Management",
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
          description: null,
          icon: null,
          sortOrder: 0,
          isEnabled: false,
          enabledAt: null,
          disabledAt: null,
          availableToParent: true,
        },
      ]);
      expect(mockedPrisma.tenantModule.findMany).not.toHaveBeenCalled();
      expect(mockedPrisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ tenantModules: { where: { tenantId: 5n }, select: expect.anything() } }),
        }),
      );
    });

    it("reflects an existing entitlement row's status", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: null });
      const enabledAt = new Date("2026-01-01");
      mockedPrisma.module.findMany.mockResolvedValue([
        {
          id: 2n,
          name: "Users",
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

    it("marks a module unavailable when the tenant's parent doesn't have it enabled", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: 11n });
      mockedPrisma.tenantModule.findMany.mockResolvedValue([{ moduleId: 1n }]); // parent has module 1 only
      mockedPrisma.module.findMany.mockResolvedValue([
        { id: 1n, name: "Tenants", description: null, icon: null, sortOrder: 0, tenantModules: [] },
        { id: 2n, name: "Audit Logs", description: null, icon: null, sortOrder: 1, tenantModules: [] },
      ]);

      const result = await tenantModuleService.getModulesForTenant(5n);

      expect(mockedPrisma.tenantModule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 11n, isEnabled: true } }),
      );
      expect(result).toEqual([
        expect.objectContaining({ moduleId: 1n, availableToParent: true }),
        expect.objectContaining({ moduleId: 2n, availableToParent: false }),
      ]);
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
    it("enables a module, clears disabledAt, and reports availableToParent", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: null });
      mockedPrisma.tenantModule.upsert.mockResolvedValue({
        tenantId: 5n,
        moduleId: 1n,
        isEnabled: true,
        enabledAt: new Date("2026-01-01"),
        disabledAt: null,
        module: { name: "Tenant Management", description: null, icon: null, sortOrder: 0 },
      });

      const result = await tenantModuleService.setModuleEnabled(5n, 1n, true, 9n);

      expect(mockedPrisma.tenantModule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_moduleId: { tenantId: 5n, moduleId: 1n } },
          create: expect.objectContaining({ tenantId: 5n, moduleId: 1n, isEnabled: true, createdBy: 9n }),
          update: expect.objectContaining({ isEnabled: true, disabledAt: null }),
        }),
      );
      expect(result.availableToParent).toBe(true);
    });

    it("disables a module and sets disabledAt without touching createdBy", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: null });
      mockedPrisma.tenantModule.upsert.mockResolvedValue({
        tenantId: 5n,
        moduleId: 1n,
        isEnabled: false,
        enabledAt: new Date("2026-01-01"),
        disabledAt: new Date("2026-01-02"),
        module: { name: "Tenant Management", description: null, icon: null, sortOrder: 0 },
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

  describe("grantInheritedModuleAccess", () => {
    it("grants every active module when there's no parent (the platform tenant)", async () => {
      mockedPrisma.module.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);
      mockedPrisma.tenantModule.createMany.mockResolvedValue({ count: 2 });

      await tenantModuleService.grantInheritedModuleAccess(5n, null, 9n);

      expect(mockedPrisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      );
      expect(mockedPrisma.tenantModule.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ tenantId: 5n, moduleId: 1n, isEnabled: true, createdBy: 9n }),
          expect.objectContaining({ tenantId: 5n, moduleId: 2n, isEnabled: true, createdBy: 9n }),
        ],
        skipDuplicates: true,
      });
    });

    it("grants only the parent's currently-enabled modules when a parent exists", async () => {
      mockedPrisma.tenantModule.findMany.mockResolvedValue([{ moduleId: 3n }]);
      mockedPrisma.tenantModule.createMany.mockResolvedValue({ count: 1 });

      await tenantModuleService.grantInheritedModuleAccess(6n, 11n, 9n);

      expect(mockedPrisma.tenantModule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 11n, isEnabled: true } }),
      );
      expect(mockedPrisma.module.findMany).not.toHaveBeenCalled();
      expect(mockedPrisma.tenantModule.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ tenantId: 6n, moduleId: 3n, isEnabled: true, createdBy: 9n })],
        skipDuplicates: true,
      });
    });

    it("does nothing when there are no modules to inherit", async () => {
      mockedPrisma.module.findMany.mockResolvedValue([]);

      await tenantModuleService.grantInheritedModuleAccess(5n, null);

      expect(mockedPrisma.tenantModule.createMany).not.toHaveBeenCalled();
    });
  });

  describe("isModuleAvailableToParent", () => {
    it("is unrestricted for a tenant with no parent", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: null });
      expect(await tenantModuleService.isModuleAvailableToParent(5n, 1n)).toBe(true);
      expect(mockedPrisma.tenantModule.findUnique).not.toHaveBeenCalled();
    });

    it("returns true when the parent has the module enabled", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: 11n });
      mockedPrisma.tenantModule.findUnique.mockResolvedValue({ isEnabled: true });

      expect(await tenantModuleService.isModuleAvailableToParent(5n, 1n)).toBe(true);
      expect(mockedPrisma.tenantModule.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId_moduleId: { tenantId: 11n, moduleId: 1n } } }),
      );
    });

    it("returns false when the parent doesn't have the module enabled", async () => {
      mockedPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ parentTenantId: 11n });
      mockedPrisma.tenantModule.findUnique.mockResolvedValue(null);

      expect(await tenantModuleService.isModuleAvailableToParent(5n, 1n)).toBe(false);
    });
  });
});
