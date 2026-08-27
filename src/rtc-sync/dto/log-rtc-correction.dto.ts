import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RtcCorrectionDto {
  @IsString() @IsNotEmpty() deviceId: string;
  @IsString() @IsNotEmpty() operatorId: string;

  @IsOptional() @IsString() sessionId?: string;

  @IsNumber() oldTimestampMs: number;
  @IsNumber() newTimestampMs: number;
  // driftMs is computed server-side: Math.abs(newTimestampMs - oldTimestampMs)
}
