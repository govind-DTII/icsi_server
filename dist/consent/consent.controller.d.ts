import { ConsentService } from './consent.service';
export declare class ConsentController {
    private readonly consentService;
    constructor(consentService: ConsentService);
    getAll(req: any): Promise<any[]>;
    getById(id: string, req: any): Promise<any>;
    hidResult(id: string, body: {
        status: string;
        used_at?: number;
    }, req: any): Promise<{
        status: string;
    }>;
    abort(id: string, body: {
        reason?: string;
    }, req: any): Promise<void>;
}
