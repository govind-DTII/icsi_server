import { ConsentRequest } from '../entities/consent-request.entity';
export declare class CreateAuditDto {
    action: string;
    type: 'approve' | 'reject' | 'login' | 'ble' | 'system';
    actorId?: string;
    actorRole?: string;
    actorName?: string;
    detail?: string;
    consentRequest?: ConsentRequest;
    consentId?: string;
    txn?: string;
    sessionId?: string;
    deviceId?: string;
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
