import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @IsOptional()
  @IsString()
  apnsToken?: string;

  @IsEnum(['android', 'ios'])
  platform: string;

  @IsOptional()
  @IsString()
  macAddress?: string;
}
