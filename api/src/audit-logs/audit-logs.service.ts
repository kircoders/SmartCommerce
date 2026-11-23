// Phase 12

// WHAT THIS FILE IS:
// Writes audit rows (record - called only by AuditInterceptor) and reads
// them for the admin Audit Logs page (findAll with filters + pages, findOne).

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_AUDIT_PAGE_SIZE,
  ListAuditLogsQueryDto,
} from './dto/list-audit-logs-query.dto';
import {
  AuditAction,
  AuditEntityType,
  AuditLogEntity,
} from './entities/audit-log.entity';

export interface NewAuditLog {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  description: string;
}

export interface AuditLogPage {
  items: AuditLogEntity[];
  total: number;
  page: number;
  pageSize: number;
}

// Only these user columns go out with each row (no password hash, etc.).
const USER_COLUMNS = [
  'user.id',
  'user.firstName',
  'user.lastName',
  'user.email',
  'user.role',
];

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async record(entry: NewAuditLog): Promise<void> {
    await this.auditRepo.insert(entry);
  }

  async findAll(query: ListAuditLogsQueryDto): Promise<AuditLogPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_AUDIT_PAGE_SIZE;

    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoin('log.user', 'user')
      .addSelect(USER_COLUMNS)
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.userId)
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    if (query.entityType)
      qb.andWhere('log.entityType = :entityType', {
        entityType: query.entityType,
      });
    if (query.action)
      qb.andWhere('log.action = :action', { action: query.action });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) {
      // A bare date ("2026-11-18") means the whole day, so compare against
      // the start of the NEXT day.
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
        qb.andWhere(`log.createdAt < (:to::date + INTERVAL '1 day')`, {
          to: query.to,
        });
      } else {
        qb.andWhere('log.createdAt <= :to', { to: query.to });
      }
    }

    const term = query.q?.trim();
    if (term) {
      qb.andWhere(
        `(log.description ILIKE :term OR user.email ILIKE :term
          OR user.firstName ILIKE :term OR user.lastName ILIKE :term)`,
        { term: `%${term}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<AuditLogEntity> {
    const log = await this.auditRepo
      .createQueryBuilder('log')
      .leftJoin('log.user', 'user')
      .addSelect(USER_COLUMNS)
      .where('log.id = :id', { id })
      .getOne();
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
