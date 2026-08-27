import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export enum EventDirection {
  APP_TO_FW = 'APP_TO_FW',
  FW_TO_APP = 'FW_TO_APP',
  APP_TO_BE = 'APP_TO_BE',
  BE_TO_APP = 'BE_TO_APP',
}

export class BleEventDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() consentId?: string;
  @IsOptional() @IsString() txn?: string;

  @IsString() @IsNotEmpty() eventType: string;

  @IsOptional() @IsEnum(EventDirection) direction?: EventDirection;
  @IsOptional() @IsObject() payloadSummary?: Record<string, unknown>;
  @IsOptional() @IsString() errorCode?: string;
  // BLE write attempts for a retried op (e.g. the 0302 retry loop).
  @IsOptional() @IsInt() retryCount?: number;
  @IsOptional() @IsString() deviceId?: string;
  // NOTE: actorId is intentionally NOT accepted from the client — the controller
  // sets it server-side from the authenticated JWT (req.user).
}
