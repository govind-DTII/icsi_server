import { ConsentRequest } from '../entities/consent-request.entity';
export declare class CreateAuditDto {
    action: string;
    type: 'approve' | 'reject' | 'login' | 'ble' | 'system';
    actorId?: string;
    actorRole?: string;
    detail?: string;
    consentRequest?: ConsentRequest;
}
