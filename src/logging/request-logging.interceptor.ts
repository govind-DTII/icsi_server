import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LoggerService } from './logger.service';

/**
 * One structured line per HTTP request via the existing pino LoggerService.
 *
 * - Assigns/propagates a `requestId` (honours an inbound `x-request-id` header,
 *   else mints a UUID), exposes it on `req.requestId` so the exception filter
 *   and any downstream code can correlate, and echoes it on the response
 *   `x-request-id` header.
 * - Logs method, path, status, durationMs, requestId and actorId
 *   (`req.user.userId`, populated by JwtAuthGuard). Bodies are NEVER logged —
 *   they could carry PIN/JWT; pino redaction is only a backstop.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly appLog: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = requestId;
    try {
      res.setHeader('x-request-id', requestId);
    } catch {
      /* response may already be detached — ignore */
    }

    const startTime = Date.now();
    const method = req.method;
    const path = req.route?.path ?? req.originalUrl?.split('?')[0] ?? req.url;

    const emit = (statusCode: number, threw: boolean) => {
      const durationMs = Date.now() - startTime;
      const ctx = {
        service: 'http',
        requestId,
        actorId: req.user?.userId,
        durationMs,
      };
      const line = `${method} ${path} ${statusCode} ${durationMs}ms`;
      if (threw || statusCode >= 500) this.appLog.error(line, ctx);
      else if (statusCode >= 400) this.appLog.warn(line, ctx);
      else this.appLog.log(line, ctx);
    };

    return next.handle().pipe(
      tap(() => emit(res.statusCode, false)),
      catchError((err) => {
        const status =
          typeof err?.getStatus === 'function' ? err.getStatus() : 500;
        emit(status, true);
        return throwError(() => err);
      }),
    );
  }
}
