import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { buildPaginationMeta, PaginatedResult, toSkipTake } from "../interfaces/pagination";

export interface RecordAuditLogInput {
  actorUserId: bigint;
  action: string;
  targetType: string;
  targetId?: bigint;
  tenantId?: bigint;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: bigint;
  actorUserId: bigint;
  action: string;
  targetType: string;
  targetId: bigint | null;
  tenantId: bigint | null;
  metadata: unknown;
  createdAt: Date;
}

const auditLogSelect = {
  id: true,
  actorUserId: true,
  action: true,
  targetType: true,
  targetId: true,
  tenantId: true,
  metadata: true,
  createdAt: true,
} as const;

export function recordAuditLog(input: RecordAuditLogInput): Promise<AuditLogEntry> {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      tenantId: input.tenantId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    select: auditLogSelect,
  });
}

export async function getAuditLogs(params: {
  page: number;
  pageSize: number;
  // Restricts results to entries scoped to this set of tenant ids (the
  // caller's own tenant plus its descendants) — entries with no tenantId
  // (system-level actions) are always included.
  visibleTenantIds: bigint[];
}): Promise<PaginatedResult<AuditLogEntry>> {
  const { skip, take } = toSkipTake(params.page, params.pageSize);
  const where: Prisma.AuditLogWhereInput = {
    OR: [{ tenantId: null }, { tenantId: { in: params.visibleTenantIds } }],
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ where, select: auditLogSelect, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, params.page, params.pageSize) };
}
