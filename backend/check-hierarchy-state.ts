import { prisma } from "./src/config/prisma";

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true, isPlatform: true, parentTenantId: true, deletedAt: true },
    orderBy: { id: "asc" },
  });
  console.log(JSON.stringify(tenants, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));

  const modules = await prisma.module.findMany({
    select: { id: true, name: true, code: true, isPlatformOnly: true, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  console.log(JSON.stringify(modules, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));

  await prisma.$disconnect();
}

main();
