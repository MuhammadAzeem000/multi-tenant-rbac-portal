import { prisma } from "../config/prisma";
import * as auditLogService from "../services/auditLog.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
};

describe("auditLog.service", () => {
  it("recordAuditLog writes the actor, action, and target", async () => {
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 1n });

    await auditLogService.recordAuditLog({
      actorUserId: 9n,
      action: "tenant.suspend",
      targetType: "tenant",
      targetId: 2n,
      tenantId: 2n,
    });

    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: 9n,
          action: "tenant.suspend",
          targetType: "tenant",
          targetId: 2n,
          tenantId: 2n,
        }),
      }),
    );
  });

  it("getAuditLogs paginates and orders newest first", async () => {
    mockedPrisma.auditLog.findMany.mockResolvedValue([]);
    mockedPrisma.auditLog.count.mockResolvedValue(0);

    await auditLogService.getAuditLogs({ page: 1, pageSize: 20, visibleTenantIds: [1n] });

    expect(mockedPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" }, skip: 0, take: 20 }),
    );
  });

  it("getAuditLogs scopes to the visible tenant ids, always including system-level (null tenantId) entries", async () => {
    mockedPrisma.auditLog.findMany.mockResolvedValue([]);
    mockedPrisma.auditLog.count.mockResolvedValue(0);

    await auditLogService.getAuditLogs({ page: 1, pageSize: 20, visibleTenantIds: [1n, 2n] });

    expect(mockedPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ tenantId: null }, { tenantId: { in: [1n, 2n] } }] },
      }),
    );
    expect(mockedPrisma.auditLog.count).toHaveBeenCalledWith({
      where: { OR: [{ tenantId: null }, { tenantId: { in: [1n, 2n] } }] },
    });
  });
});
