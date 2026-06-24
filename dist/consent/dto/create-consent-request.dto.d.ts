export declare class CreateConsentRequestDto {
    txn: string;
    consent_id: string;
    device_id: string;
    title: string;
    scope: string;
    priority: string;
    owner_id?: string;
    operator_id?: string;
    description?: string;
    session_id?: string;
    expires_at?: string | number;
    attachment_name?: string;
    attachment_url?: string;
    attachment_hash?: string;
}
