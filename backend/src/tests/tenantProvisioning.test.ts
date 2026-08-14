import "../utils/bigint";
import { prisma } from "../config/prisma";
import { provisionTenant } from "../services/tenantProvisioning.service";
import * as tenantService from "../services/tenant.service";
import * as userService from "../services/user.service";

jest.mock("../config/prisma", () => ({
  prisma: {
    module: { upsert: jest.fn() },
    action: { upsert: jest.fn() },
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
  module: { upsert: jest.Mock };
  action: { upsert: jest.Mock };
  permission: { create: jest.Mock };
  role: { create: jest.Mock };
  rolePermission: { createMany: jest.Mock };
  user: { update: jest.Mock };
  userRole: { create: jest.Mock };
};

describe("provisionTenant", () => {
  it("creates modules, actions, tenant, permissions, an admin role, and the admin user", async () => {
    mockedPrisma.module.upsert.mockImplementation(({ create }: { create: { code: string } }) =>
      Promise.resolve({ id: BigInt(`1${create.code.length}`), ...create }),
    );
    mockedPrisma.action.upsert.mockImplementation(({ create }: { create: { code: string } }) =>
      Promise.resolve({ id: BigInt(`2${create.code.length}`), ...create }),
    );
    (tenantService.createTenant as jest.Mock).mockResolvedValue({ id: 5n, slug: "acme" });
    mockedPrisma.permission.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 9n, ...data }),
    );
    mockedPrisma.role.create.mockResolvedValue({ id: 7n });
    (userService.createUser as jest.Mock).mockResolvedValue({ id: 3n });

    const result = await provisionTenant({
      tenantName: "Acme Corp",
      tenantSlug: "acme",
      tenantDomain: "acme.test",
      adminName: "Alice Admin",
      adminUsername: "alice",
      adminEmailLocalPart: "alice",
      adminPassword: "supersecret",
    });

    expect(tenantService.createTenant).toHaveBeenCalledWith({
      name: "Acme Corp",
      slug: "acme",
      domain: "acme.test",
    });
    expect(mockedPrisma.module.upsert).toHaveBeenCalledTimes(7);
    expect(mockedPrisma.action.upsert).toHaveBeenCalledTimes(4);
    expect(mockedPrisma.permission.create).toHaveBeenCalledTimes(28);
    expect(mockedPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 5n, code: "admin" }) }),
    );
    expect(mockedPrisma.rolePermission.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ tenantId: 5n, roleId: 7n })]),
      }),
    );
    expect(userService.createUser).toHaveBeenCalledWith({
      tenantId: 5n,
      name: "Alice Admin",
      username: "alice",
      emailLocalPart: "alice",
      password: "supersecret",
    });
    expect(mockedPrisma.userRole.create).toHaveBeenCalledWith({
      data: { tenantId: 5n, userId: 3n, roleId: 7n },
    });
    expect(result).toEqual({ tenant: { id: 5n, slug: "acme" }, user: { id: 3n } });
  });
});
