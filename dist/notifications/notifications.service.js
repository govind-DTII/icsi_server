"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const admin = require("firebase-admin");
let NotificationsService = class NotificationsService {
    constructor() {
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
            console.log('✅ Firebase Admin initialized');
        }
        catch (error) {
            console.warn('⚠️  Firebase not configured — FCM disabled. Add FCM keys to .env');
        }
    }
    async sendToDevice(fcmToken, payload) {
        if (!this.initialized) {
            console.log('FCM not configured — skipping push:', payload.title);
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
            const response = await admin.messaging().send(message);
            console.log(`✅ FCM sent: ${payload.title} → ${response}`);
            return true;
        }
        catch (error) {
            console.error('❌ FCM error:', error.message);
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
    (0, common_1.Injectable)()
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map