import { ConsentService } from './consent.service';
export declare class ConsentResponseController {
    private readonly consentService;
    constructor(consentService: ConsentService);
    submit(body: {
        consent_id: string;
        decision: string;
        reason?: string;
    }, req: any): Promise<{
        status: string;
        consent_id: string;
        decision: string;
        decided_at: number;
    }>;
    getResponse(consentId: string, req: any): Promise<{
        consent_id: string;
        txn: string;
        decision: string | null;
        jwt_token: string | null;
        payload: string | null;
        reason: string | null;
        decided_at: number | null;
    }>;
}
