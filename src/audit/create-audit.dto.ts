import { ConsentRequest } from '../entities/consent-request.entity';

export class CreateAuditDto {
  action: string;
  type: 'approve' | 'reject' | 'login' | 'ble' | 'system';
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  detail?: string;
  consentRequest?: ConsentRequest;
  // Correlation keys. Usually auto-filled from `consentRequest` by
  // AuditService.log; pass explicitly for entries that have a consent context
  // but no entity (e.g. relayed BLE packets).
  consentId?: string;
  txn?: string;
  sessionId?: string;
  deviceId?: string;
  // SER evidence fields (consent-create rows).
  documentName?: string | null;
  attachmentHash?: string | null;
  fileUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}
