import { OnModuleInit } from '@nestjs/common';
export declare class NotificationsService implements OnModuleInit {
    private initialized;
    onModuleInit(): void;
    sendToDevice(fcmToken: string, payload: {
        title: string;
        body: string;
        data?: Record<string, string>;
    }): Promise<boolean>;
    sendConsentRequest(fcmToken: string, consentId: string, title: string, txnRef: string, fileUrl?: string, description?: string): Promise<boolean>;
    sendConsentResult(fcmToken: string, consentId: string, status: string, txnRef: string, jwtToken?: string, title?: string): Promise<boolean>;
    sendConsentResponseReady(fcmToken: string, consentId: string, txn: string, decision: string, title?: string): Promise<boolean>;
    sendBleResponse(fcmToken: string, blePacket: Record<string, any>): Promise<boolean>;
}
