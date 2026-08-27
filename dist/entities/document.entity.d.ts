import { ConsentRequest } from './consent-request.entity';
import { User } from './user.entity';
export declare class Document {
    id: string;
    fileName: string;
    s3Key: string;
    s3Url: string;
    consentRequest: ConsentRequest;
    uploadedBy: User;
    createdAt: Date;
}
