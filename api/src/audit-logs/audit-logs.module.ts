// Phase 12

// WHAT THIS FILE IS:
// The audit log module: the audit_logs table, the admin read endpoints, and
// AuditInterceptor registered as a GLOBAL interceptor (APP_INTERCEPTOR), so
// it runs on every route in the app - which is what lets any controller use
// @Audit(...) without importing anything but the decorator.

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogEntity } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditLogsModule {}
