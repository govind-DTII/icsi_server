import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger as PinoLogger } from 'pino';

/**
 * Structured application log — third, independent channel alongside the two DB
 * audit trails (`audit_logs` via AuditService, `ble_event_audit` via
 * BleEventsService). Writes newline-delimited JSON to a daily-rolled file:
 *
 *   backend/logs/app-<appName>.<YYYY-MM-DD>.1.log
 *
 * NOTE on the filename: pino-roll 4.x hardwires its naming as
 * `<file>.<date>.<count>.<ext>` (see node_modules/pino-roll/lib/utils.js
 * buildFileName). The `.1` rotation counter and the `.` separators are not
 * configurable, so the literal `app-dtii-2026-06-08.log` cannot be produced by
 * pino-roll; this is the closest faithful form given the "use pino-roll"
 * constraint. The counter stays `.1` because we roll by day (frequency), not
 * by size.
 *
 * Sensitive fields (pin, pinValue, payload, consentPayload, ownerName,
 * operatorName) are NEVER written: each call copies only the allowed keys, and
 * pino `redact` removes the sensitive keys as a defence-in-depth safety net.
 *
 * A logging failure can NEVER fail a business transaction: every write is
 * wrapped in try/catch that swallows, and pino-roll runs in a worker thread so
 * file I/O errors surface only on the dedicated [LOGGING_FAILURE] stderr
 * channel.
 */

export interface LogContext {
  // Trace anchor. In-session lines correlate on `sessionId` (consent, BLE
  // events, HID, tamper, RTC all happen inside a session). `requestId` is for
  // pre-/post-session HTTP calls that have no session yet (e.g. login) — set it
  // only where `sessionId` is null.
  requestId?: string;
  service?: string;
  actorId?: string;
  sessionId?: string;
  consentId?: string;
  txnRef?: string;
  deviceId?: string;
  eventType?: string;
  durationMs?: number;
  errorCode?: string;
}

// Only these keys are ever copied onto a log line. Anything else a caller
// passes (including sensitive fields) is dropped before it reaches pino.
const ALLOWED_KEYS: (keyof LogContext)[] = [
  'requestId',
  'service',
  'actorId',
  'sessionId',
  'consentId',
  'txnRef',
  'deviceId',
  'eventType',
  'durationMs',
  'errorCode',
];

// Defence-in-depth: even if one of these somehow reaches pino, strip it.
const SENSITIVE_KEYS = [
  'pin',
  'pinValue',
  'payload',
  'consentPayload',
  'ownerName',
  'operatorName',
];

@Injectable()
export class LoggerService implements OnModuleDestroy {
  private readonly pino: PinoLogger;
  private readonly appName: string;

  constructor(private readonly config: ConfigService) {
    const appName = this.config.get<string>('APP_NAME') ?? 'dtii';
    this.appName = appName;

    const transport = pino.transport({
      target: 'pino-roll',
      options: {
        file: `logs/app-${appName}`,
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        extension: '.log',
        mkdir: true, // creates logs/ on first write if absent
      },
    });

    // Async worker write errors land here — never thrown into the app.
    transport.on('error', (err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[LOGGING_FAILURE] pino-roll transport error', err);
    });

    this.pino = pino(
      {
        level: this.config.get<string>('LOG_LEVEL') ?? 'debug',
        // null → no pid/hostname noise. `service` is set per-line in write()
        // (call-site value, else appName) so it appears exactly once.
        base: null,
        messageKey: 'message',
        // Rename pino's default `time` key to `timestamp` (ISO8601, UTC `Z`).
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        formatters: {
          level: (label) => ({ level: label }), // string level, not a number
        },
        redact: {
          paths: [...SENSITIVE_KEYS, ...SENSITIVE_KEYS.map((k) => `*.${k}`)],
          remove: true,
        },
      },
      transport,
    );
  }

  log(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  private write(
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
    context?: LogContext,
  ): void {
    try {
      // `service` defaults to the app name; a call-site `service` (in
      // ALLOWED_KEYS) overrides it in the loop — so it appears exactly once.
      const safe: Record<string, unknown> = { service: this.appName };
      if (context) {
        for (const key of ALLOWED_KEYS) {
          const value = context[key];
          if (value !== undefined) safe[key] = value;
        }
      }
      this.pino[level](safe, message);
    } catch (err) {
      // Logging must never break the business transaction — swallow and divert.
      try {
        // eslint-disable-next-line no-console
        console.error('[LOGGING_FAILURE]', level, message, err);
      } catch {
        /* nothing more we can safely do */
      }
    }
  }

  onModuleDestroy(): void {
    // Best-effort flush so buffered lines aren't lost on shutdown.
    try {
      this.pino.flush?.();
    } catch {
      /* swallow — shutdown must not throw */
    }
  }
}
