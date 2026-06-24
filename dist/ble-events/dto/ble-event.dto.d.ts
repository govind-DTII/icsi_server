export declare enum EventDirection {
    APP_TO_FW = "APP_TO_FW",
    FW_TO_APP = "FW_TO_APP",
    APP_TO_BE = "APP_TO_BE",
    BE_TO_APP = "BE_TO_APP"
}
export declare class BleEventDto {
    sessionId?: string;
    consentId?: string;
    txn?: string;
    eventType: string;
    direction?: EventDirection;
    payloadSummary?: Record<string, unknown>;
    errorCode?: string;
}
