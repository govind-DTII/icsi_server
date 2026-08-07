import { OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../logging/logger.service';
export declare class NotificationsService implements OnModuleInit {
    private readonly appLog;
    private initialized;
    constructor(appLog: LoggerService);
    onModuleInit(): void;
    sendToDevice(fcmToken: string, payload: {
        title: string;
        body: string;
        data?: Record<string, string>;
    }): Promise<boolean>;
    sendConsentRequest(fcmToken: string, consentId: string, title: string, txnRef: string, fileUrl?: string, description?: string): Promise<boolean>;
    sendConsentResult(fcmToken: string, consentId: string, status: string, txnRef: string, jwtToken?: string, title?: string): Promise<boolean>;
    sendConsentResponseReady(fcmToken: string, consentId: string, txn: string, decision: string, title?: string): Promise<boolean>;
    sendHidInjectSuccess(fcmToken: string, consentId: string, txn: string, operatorName: string, documentName: string, usedAtMs: number): Promise<boolean>;
    sendBleResponse(fcmToken: string, blePacket: Record<string, any>): Promise<boolean>;
}
