import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// Spec §3.1 — body of POST /consent_request (multipart/form-data; the file
// itself arrives separately as `document` via FileInterceptor). A global
// ValidationPipe with `forbidNonWhitelisted: true` is active, so EVERY field the
// app sends must be declared here or the request is rejected.
export class CreateConsentRequestDto {
  // Mandatory — §3.1 pre-conditions / user-entered fields.
  @IsString()
  @IsNotEmpty()
  @Matches(/^TXN-[0-9A-F]{6}$/i, {
    message: 'txn must match TXN-XXXXXX (6 hex chars)',
  })
  txn: string;

  @IsString()
  @IsNotEmpty()
  consent_id: string;

  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['READ', 'WRITE', 'READ_WRITE'])
  scope: string;

  @IsIn(['normal', 'high'])
  priority: string;

  // Optional — owner_id/operator_id are resolved/validated from the DB at
  // runtime (never trusted from or required of the client).
  @IsOptional()
  @IsString()
  owner_id?: string;

  @IsOptional()
  @IsString()
  operator_id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  session_id?: string;

  // Multipart sends this as a string; the controller coerces to a number.
  // §3.1: expires_at is app-owned, so not asserted server-side.
  @IsOptional()
  expires_at?: string | number;

  // Spec §3.1 — app-generated attachment metadata.
  @IsOptional()
  @IsString()
  attachment_name?: string;

  @IsOptional()
  @IsString()
  attachment_url?: string;

  @IsOptional()
  @IsString()
  attachment_hash?: string;
}
