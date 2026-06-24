import { ConsentService } from './consent.service';
import { CreateConsentRequestDto } from './dto/create-consent-request.dto';
export declare class ConsentRequestController {
    private readonly consentService;
    constructor(consentService: ConsentService);
    create(body: CreateConsentRequestDto, file: Express.Multer.File, req: any): Promise<{
        status: string;
        message: string;
        consent_id: string;
        txn: string;
        state: string;
        created_at: number;
    }>;
}
