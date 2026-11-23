// Phase 12

// WHAT THIS FILE IS:
// Runs around EVERY request (registered globally in AuditLogsModule). If the
// route has @Audit(...) and the request succeeded, it writes one audit_logs
// row. Routes without @Audit, and requests that throw (400, 403, 404...),
// are never recorded.
//
// Writing the row is awaited, so it's saved before the response goes out.
// If the write itself fails, that's logged and the response still succeeds -
// a broken audit insert shouldn't undo an order that was already placed.

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, mergeMap } from 'rxjs';
import { AUDIT_KEY, AuditContext, AuditOptions } from './audit.decorator';
import { AuditLogsService } from './audit-logs.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogs: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditOptions | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string } }>();

    // next.handle() runs the route; mergeMap runs after it returns
    // successfully (an exception skips straight past this).
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        await this.record(options, req, result);
        return result;
      }),
    );
  }

  private async record(
    options: AuditOptions,
    req: Request & { user?: { id: string } },
    result: unknown,
  ): Promise<void> {
    try {
      const ctx: AuditContext = {
        data: asObject(asObject(result)['data']),
        params: (req.params ?? {}) as Record<string, string>,
        body: asObject(req.body),
        userId: req.user?.id ?? null,
      };

      const action =
        typeof options.action === 'function'
          ? options.action(ctx)
          : options.action;
      if (!action) return;

      const userId = options.actorId ? options.actorId(ctx) : ctx.userId;
      if (!userId) {
        this.logger.warn(`Audit ${action} skipped: no user`);
        return;
      }

      const entityId = options.entityId
        ? options.entityId(ctx)
        : (stringOrNull(ctx.data['id']) ?? stringOrNull(ctx.params['id']));

      await this.auditLogs.record({
        userId,
        action,
        entityType: options.entityType,
        entityId,
        description: options.describe(ctx),
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit log: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
