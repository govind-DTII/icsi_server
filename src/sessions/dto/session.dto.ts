import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum SessionState {
  IDLE = 'IDLE',
  CONSENT_REQUESTED = 'CONSENT_REQUESTED',
  CONSENT_ACTIVE = 'CONSENT_ACTIVE',
  CONSENT_COMPLETED = 'CONSENT_COMPLETED',
  SESSION_ENDING = 'SESSION_ENDING',
}

export enum EndReason {
  COMPLETED = 'COMPLETED',
  TAMPER = 'TAMPER',
  TIMEOUT = 'TIMEOUT',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
  ABORTED_BY_USER = 'ABORTED_BY_USER',
  // Spec §3.2 operator manual rejection — the session ends because the operator
  // declined the request. Kept distinct from a plain user-abort so ended_reason
  // matches the consent decision relayed to firmware.
  OPERATOR_DECLINED = 'OPERATOR_DECLINED',
}

export class CreateSessionDto {
  @IsString() @IsNotEmpty() sessionId: string;
  @IsString() @IsNotEmpty() deviceId: string;
  @IsString() @IsNotEmpty() operatorId: string;
  @IsString() @IsNotEmpty() ownerId: string;

  // Handshake/pairing txn (PAIR-XXXX) echoed from session_announce → session_ack.
  // Stored on the ble_sessions row so it correlates with the app-logged
  // SESSION_ANNOUNCE / SESSION_ACK_SENT events (which carry the same PAIR-XXXX txn).
  @IsOptional() @IsString() txn?: string;

  @IsOptional() @IsString() fwVersion?: string;
  @IsOptional() @IsString() hwVersion?: string;
  @IsOptional() @IsString() macAddress?: string;
  @IsOptional() @IsString() bleVersion?: string;
  @IsOptional() @IsString() tlsVersion?: string;
}

export class UpdateSessionStateDto {
  @IsEnum(SessionState) state: SessionState;
}

export class EndSessionDto {
  @IsEnum(EndReason) reason: EndReason;
  @IsOptional() @IsString() notes?: string;
}
