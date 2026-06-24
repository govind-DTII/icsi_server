import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Catch-all exception filter. Every error is logged through the existing pino
 * LoggerService (with redaction) and correlated on `req.requestId` set by
 * RequestLoggingInterceptor.
 *
 * Response shape is deliberately the standard NestJS one
 * (`{ statusCode, message, error }`) so the mobile app's existing DioException
 * parsing keeps working — we only add `requestId` for traceability. Unknown
 * (non-HttpException) errors return a generic 500 and never leak the underlying
 * message/stack to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly appLog: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const logCtx = {
      service: 'http',
      requestId: req?.requestId,
      actorId: req?.user?.userId,
      errorCode: String(status),
    };
    const where = `${req?.method ?? '?'} ${req?.url ?? '?'}`;

    if (isHttp && status < 500) {
      // Expected client errors (validation, auth, not-found) — no stack noise.
      this.appLog.warn(`${where} -> ${status} ${exception.message}`, logCtx);
    } else {
      const err = exception as Error;
      this.appLog.error(
        `${where} -> ${status} ${err?.message ?? exception}\n${err?.stack ?? ''}`,
        logCtx,
      );
    }

    // Build the response body, preserving Nest's default shape.
    let body: Record<string, unknown>;
    if (isHttp) {
      const payload = exception.getResponse();
      body =
        typeof payload === 'string'
          ? { statusCode: status, message: payload }
          : { ...(payload as Record<string, unknown>) };
    } else {
      body = { statusCode: status, message: 'Internal server error' };
    }
    body.requestId = req?.requestId;

    res.status(status).json(body);
  }
}
