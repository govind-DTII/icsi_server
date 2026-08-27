import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  // Optional: credential (email+password) login derives the role from the
  // matched user row. Only the DEMO_MODE role-only path requires it.
  @IsOptional()
  @IsEnum(['owner', 'operator'])
  role?: string;
}
