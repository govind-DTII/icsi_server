import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ReportedBy {
  FIRMWARE = 'firmware',
  APP = 'app',
}

export class CreateTamperEventDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  consentId?: string;

  @IsISO8601()
  detectedAt: string;

  @IsEnum(ReportedBy)
  reportedBy: ReportedBy;

  @IsOptional()
  @IsString()
  notes?: string;
}
