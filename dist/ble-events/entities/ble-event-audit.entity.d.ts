export declare class BleEventAudit {
    id: string;
    sessionId: string;
    consentId: string;
    txn: string;
    eventType: string;
    direction: string;
    payloadSummary: Record<string, unknown>;
    errorCode: string;
    recordedAt: Date;
}
