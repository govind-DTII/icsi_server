export declare enum ReportedBy {
    FIRMWARE = "firmware",
    APP = "app"
}
export declare class CreateTamperEventDto {
    deviceId: string;
    sessionId?: string;
    consentId?: string;
    detectedAt: string;
    reportedBy: ReportedBy;
    notes?: string;
}
