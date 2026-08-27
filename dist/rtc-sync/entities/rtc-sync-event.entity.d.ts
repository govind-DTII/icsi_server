export declare class RtcSyncEvent {
    id: string;
    deviceId: string;
    sessionId: string;
    operatorId: string;
    oldTimestampMs: number;
    newTimestampMs: number;
    driftMs: number;
    correctedAt: Date;
}
