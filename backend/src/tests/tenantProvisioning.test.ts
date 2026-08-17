import "../utils/bigint";
import { prisma } from "../config/prisma";
import { provisionTenant } from "../services/tenantProvisioning.service";
import { __resetPlatformTenantCache } from "../services/platformAuth.service";
import * as tenantService from "../services/tenant.service";
import * as userService from "../services/user.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    tenant: { findFirst: jest.fn() },
    module: { findFirst: jest.fn(), create: jest.fn() },
    action: { findFirst: jest.fn(), create: jest.fn() },
    permission: { create: jest.fn() },
    role: { create: jest.fn() },
    rolePermission: { createMany: jest.fn() },
    user: { update: jest.fn() },
    userRole: { create: jest.fn() },
  },
}));

jest.mock("../services/tenant.service");
jest.mock("../services/user.service");

const mockedPrisma = prisma as unknown as {
  tenant: { findFirst: jest.Mock };
  module: { findFirst: jest.Mock; create: jest.Mock };
  action: { findFirst: jest.Mock; create: jest.Mock };
  permission: { create: jest.Mock };
  role: { create: jest.Mock };
  rolePermission: { createMany: jest.Mock };
  user: { update: jest.Mock };
  userRole: { create: jest.Mock };
};

beforeEach(() => {
  __resetPlatformTenantCache();
});

describe("provisionTenant", () => {
  it("creates modules, actions, tenant, permissions, an admin role, and the admin user, as a child of the platform tenant", async () => {
    mockedPrisma.tenant.findFirst.mockResolvedValue({ id: 1n });
    mockedPrisma.module.findFirst.mockResolvedValue(null);
    mockedPrisma.module.create.mockImplementation(({ data }: { data: { name: string } }) =>
      Promise.resolve({ id: BigInt(`1${data.name.length}`), ...data }),
    );
    mockedPrisma.action.findFirst.mockResolvedValue(null);
    mockedPrisma.action.create.mockImplementation(({ data }: { data: { name: string } }) =>
      Promise.resolve({ id: BigInt(`2${data.name.length}`), ...data }),
    );
    (tenantService.createTenant as jest.Mock).mockResolvedValue({ id: 5n, domain: "acme.test" });
    mockedPrisma.permission.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 9n, ...data }),
    );
    mockedPrisma.role.create.mockResolvedValue({ id: 7n });
    (userService.createUser as jest.Mock).mockResolvedValue({ id: 3n });

    const result = await provisionTenant({
      tenantName: "Acme Corp",
      tenantDomain: "acme.test",
      adminName: "Alice Admin",
      adminEmailLocalPart: "alice",
      adminPassword: "supersecret",
    });

    expect(tenantService.createTenant).toHaveBeenCalledWith(
      {
        name: "Acme Corp",
        domain: "acme.test",
      },
      1n,
    );
    expect(mockedPrisma.module.create).toHaveBeenCalledTimes(7);
    expect(mockedPrisma.action.create).toHaveBeenCalledTimes(4);
    expect(mockedPrisma.permission.create).toHaveBeenCalledTimes(28);
    expect(mockedPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 5n, name: "Administrator" }) }),
    );
    expect(mockedPrisma.rolePermission.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ tenantId: 5n, roleId: 7n })]),
      }),
    );
    expect(userService.createUser).toHaveBeenCalledWith({
      tenantId: 5n,
      name: "Alice Admin",
      emailLocalPart: "alice",
      password: "supersecret",
    });
    expect(mockedPrisma.userRole.create).toHaveBeenCalledWith({
      data: { tenantId: 5n, userId: 3n, roleId: 7n },
    });
    expect(result).toEqual({ tenant: { id: 5n, domain: "acme.test" }, user: { id: 3n } });
  });
});
