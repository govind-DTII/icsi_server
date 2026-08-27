export declare enum SessionState {
    IDLE = "IDLE",
    CONSENT_REQUESTED = "CONSENT_REQUESTED",
    CONSENT_ACTIVE = "CONSENT_ACTIVE",
    CONSENT_COMPLETED = "CONSENT_COMPLETED",
    SESSION_ENDING = "SESSION_ENDING"
}
export declare enum EndReason {
    COMPLETED = "COMPLETED",
    TAMPER = "TAMPER",
    TIMEOUT = "TIMEOUT",
    ERROR = "ERROR",
    DISCONNECTED = "DISCONNECTED",
    ABORTED_BY_USER = "ABORTED_BY_USER",
    OPERATOR_DECLINED = "OPERATOR_DECLINED"
}
export declare class CreateSessionDto {
    sessionId: string;
    deviceId: string;
    operatorId: string;
    ownerId: string;
    txn?: string;
    fwVersion?: string;
    hwVersion?: string;
    macAddress?: string;
    bleVersion?: string;
    tlsVersion?: string;
}
export declare class UpdateSessionStateDto {
    state: SessionState;
}
export declare class EndSessionDto {
    reason: EndReason;
    notes?: string;
}
