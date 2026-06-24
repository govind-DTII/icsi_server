import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConsentRequest } from '../entities/consent-request.entity';
import { User } from '../entities/user.entity';
import { BleDevice } from '../entities/ble-device.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BleEventsService } from '../ble-events/ble-events.service';
export declare class ConsentService implements OnModuleInit, OnModuleDestroy {
    private consentRepo;
    private userRepo;
    private bleDeviceRepo;
    private auditService;
    private notificationsService;
    private bleEventsService;
    private jwtService;
    private readonly logger;
    private _expiryInterval;
    constructor(consentRepo: Repository<ConsentRequest>, userRepo: Repository<User>, bleDeviceRepo: Repository<BleDevice>, auditService: AuditService, notificationsService: NotificationsService, bleEventsService: BleEventsService, jwtService: JwtService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    expireStalePending(): Promise<number>;
    private enforceDecisionWindow;
    private stripUser;
    findAll(userId: string, role: string): Promise<any[]>;
    getConsentResponse(consentIdParam: string): Promise<{
        consent_id: string;
        txn: string;
        decision: string | null;
        jwt_token: string | null;
        payload: string | null;
        reason: string | null;
        decided_at: number | null;
    }>;
    findById(idOrConsentId: string): Promise<any>;
    private decisionTiming;
    private decisionDeadlineEpoch;
    approve(consentId: string, actorId: string): Promise<ConsentRequest>;
    private validateConsentParties;
    private sha256File;
    createConsentRequest(operatorId: string, body: {
        txn: string;
        consent_id?: string;
        device_id: string;
        owner_id?: string;
        operator_id?: string;
        title: string;
        description?: string;
        scope?: string;
        priority?: string;
        expires_at?: number;
        session_id?: string;
        attachment_name?: string;
        attachment_url?: string;
        attachment_hash?: string;
    }, file?: Express.Multer.File): Promise<{
        status: string;
        message: string;
        consent_id: string;
        txn: string;
        state: string;
        created_at: number;
    }>;
    submitConsentResponse(actorId: string, body: {
        consent_id: string;
        decision: string;
        reason?: string;
    }): Promise<{
        status: string;
        consent_id: string;
        decision: string;
        decided_at: number;
    }>;
    markAborted(idOrConsentId: string, reason: string): Promise<void>;
    reject(consentId: string, actorId: string, reason?: string): Promise<ConsentRequest>;
}
