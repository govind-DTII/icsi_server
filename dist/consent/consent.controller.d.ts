import { ConsentService } from './consent.service';
export declare class ConsentController {
    private readonly consentService;
    constructor(consentService: ConsentService);
    getAll(req: any): Promise<any[]>;
    getById(id: string): Promise<any>;
    abort(id: string, body: {
        reason?: string;
    }): Promise<void>;
}
