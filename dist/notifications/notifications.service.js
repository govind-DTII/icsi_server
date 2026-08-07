"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const admin = require("firebase-admin");
const logger_service_1 = require("../logging/logger.service");
let NotificationsService = class NotificationsService {
    constructor(appLog) {
        this.appLog = appLog;
        this.initialized = false;
    }
    onModuleInit() {
        if (admin.apps.length > 0) {
            this.initialized = true;
            return;
        }
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FCM_PROJECT_ID,
                    clientEmail: process.env.FCM_CLIENT_EMAIL,
                    privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
            this.initialized = true;
            this.appLog.log('Firebase Admin initialized', {
                service: 'notifications',
            });
        }
        catch (error) {
            this.appLog.warn(`Firebase not configured — FCM disabled (${error?.message ?? error})`, { service: 'notifications' });
        }
    }
    async sendToDevice(fcmToken, payload) {
        if (!this.initialized) {
            this.appLog.warn('FCM not configured — skipping push', {
                service: 'notifications',
                eventType: 'FCM_SKIPPED',
            });
            return false;
        }
        try {
            const message = {
                token: fcmToken,
                notification: { title: payload.title, body: payload.body },
                data: payload.data || {},
                android: {
                    priority: 'high',
                    notification: { sound: 'default', channelId: 'ascent_en_consent' },
                },
            };
            await admin.messaging().send(message);
            this.appLog.log(`fcm push sent (${payload.data?.type ?? 'unknown'})`, {
                requestId: (0, crypto_1.randomUUID)(),
                service: 'notifications',
                eventType: 'FCM_SENT',
                consentId: payload.data?.consentId ?? payload.data?.consent_id,
            });
            return true;
        }
        catch (error) {
            this.appLog.error(`fcm push failed: ${error?.message ?? error}`, {
                service: 'notifications',
                eventType: 'FCM_FAILED',
                consentId: payload.data?.consentId ?? payload.data?.consent_id,
            });
            return false;
        }
    }
    async sendConsentRequest(fcmToken, consentId, title, txnRef, fileUrl, description) {
        return this.sendToDevice(fcmToken, {
            title: '🔔 New Consent Request',
            body: title,
            data: {
                type: 'consent_request',
                consentId,
                txnRef,
                fileUrl: fileUrl ?? '',
                description: description ?? '',
                timestamp: Date.now().toString(),
            },
        });
    }
    async sendConsentResult(fcmToken, consentId, status, txnRef, jwtToken, title) {
        return this.sendToDevice(fcmToken, {
            title: status === 'approved' ? '✅ Consent Approved' : '❌ Consent Rejected',
            body: title ?? `Request ${txnRef} has been ${status}`,
            data: {
                type: 'consent_result',
                consentId,
                status,
                txnRef,
                jwt_token: jwtToken ?? '',
                title: title ?? '',
                timestamp: Date.now().toString(),
            },
        });
    }
    async sendConsentResponseReady(fcmToken, consentId, txn, decision, title) {
        return this.sendToDevice(fcmToken, {
            title: decision === 'approved' ? 'Consent approved' : 'Consent rejected',
            body: title ?? `Decision ready for ${txn}`,
            data: {
                type: 'consent_response_ready',
                consent_id: consentId,
                txn,
            },
        });
    }
    async sendHidInjectSuccess(fcmToken, consentId, txn, operatorName, documentName, usedAtMs) {
        return this.sendToDevice(fcmToken, {
            title: 'Your DSC is Affixed',
            body: '',
            data: {
                type: 'hid_inject_success',
                consent_id: consentId,
                txn,
                operator_name: operatorName,
                document_name: documentName,
                used_at: usedAtMs.toString(),
            },
        });
    }
    async sendBleResponse(fcmToken, blePacket) {
        return this.sendToDevice(fcmToken, {
            title: '📡 BLE Response Ready',
            body: `Status: ${blePacket.status} · Ref: ${blePacket.ref}`,
            data: {
                type: 'ble_response',
                ...Object.fromEntries(Object.entries(blePacket).map(([k, v]) => [k, String(v)])),
            },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map