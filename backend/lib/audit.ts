import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogAction {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAction(data: LogAction): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        entity: data.entity || null,
        entityId: data.entityId || null,
        details: (data.details as any) || undefined,
        ipAddress: data.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getAuditLogs(options: {
  userId?: string;
  action?: string;
  entity?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const where: Record<string, unknown> = {};
  if (options.userId) where.userId = options.userId;
  if (options.action) where.action = options.action;
  if (options.entity) where.entity = options.entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, identifier: true } } },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
