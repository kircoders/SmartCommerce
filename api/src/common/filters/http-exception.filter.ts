// Phase 1

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as { message?: string | string[] }).message ?? exception.message
        : 'Internal server error';

    // The client only ever sees the sanitized message above - never a stack
    // trace (docs/standards.md: never expose internal errors to the
    // client). Without logging the real exception here, an unexpected
    // crash would leave nothing to debug with beyond a bare "500" - this
    // is what actually makes a bug findable afterward, in CloudWatch or a
    // local console.
    //
    // Expected errors (NotFoundException, BadRequestException, etc. -
    // deliberate, meaningful on their own) just get a short warn line.
    // Anything else - a genuine unhandled crash - gets the full stack
    // trace, since that's the only place it will ever be visible.
    if (exception instanceof HttpException) {
      this.logger.error(`${request.method} ${request.url} → ${status} ${JSON.stringify(message)}`);
    } else {
      this.logger.error(
        `${request.method} ${request.url} → 500 (unhandled exception)`,
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
    });
  }
}
