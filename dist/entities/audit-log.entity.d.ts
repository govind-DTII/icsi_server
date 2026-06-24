import { ConsentRequest } from './consent-request.entity';
export declare class AuditLog {
    id: string;
    action: string;
    detail: string;
    type: string;
    actorId: string;
    actorRole: string;
    consentRequest: ConsentRequest;
    createdAt: Date;
}
