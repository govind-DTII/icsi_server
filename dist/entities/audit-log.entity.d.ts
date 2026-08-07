import { ConsentRequest } from './consent-request.entity';
export declare class AuditLog {
    id: string;
    action: string;
    detail: string;
    type: string;
    actorId: string;
    actorRole: string;
    actorName: string;
    consentId: string;
    txn: string;
    sessionId: string;
    deviceId: string;
    documentName: string | null;
    attachmentHash: string | null;
    fileUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    locationAccuracy: number | null;
    street: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    consentRequest: ConsentRequest;
    createdAt: Date;
}
