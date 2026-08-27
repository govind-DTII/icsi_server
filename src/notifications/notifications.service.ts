import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private initialized = false;

  constructor(private readonly appLog: LoggerService) {}

  onModuleInit() {
    // Guard against double-init in watch mode (Firebase Admin is a global singleton)
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
    } catch (error) {
      this.appLog.warn(
        `Firebase not configured — FCM disabled (${(error as Error)?.message ?? error})`,
        { service: 'notifications' },
      );
    }
  }

  async sendToDevice(
    fcmToken: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<boolean> {
    if (!this.initialized) {
      this.appLog.warn('FCM not configured — skipping push', {
        service: 'notifications',
        eventType: 'FCM_SKIPPED',
      });
      return false;
    }
    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: { title: payload.title, body: payload.body },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'ascent_en_consent' },
        },
      };
      await admin.messaging().send(message);
      // Confirmed delivery to FCM. References only — no token, no title/body.
      this.appLog.log(`fcm push sent (${payload.data?.type ?? 'unknown'})`, {
        // No sessionId is threaded down to the raw push; consentId is the
        // correlation hook, plus a per-push requestId.
        requestId: randomUUID(),
        service: 'notifications',
        eventType: 'FCM_SENT',
        consentId: payload.data?.consentId ?? payload.data?.consent_id,
      });
      return true;
    } catch (error) {
      // FCM send failure means owner/operator never got the wake-up ping —
      // log it structurally so "notification never arrived" is debuggable.
      this.appLog.error(`fcm push failed: ${error?.message ?? error}`, {
        service: 'notifications',
        eventType: 'FCM_FAILED',
        consentId: payload.data?.consentId ?? payload.data?.consent_id,
      });
      return false;
    }
  }

  async sendConsentRequest(
    fcmToken: string,
    consentId: string,
    title: string,
    txnRef: string,
    fileUrl?: string,
    description?: string,
  ): Promise<boolean> {
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

  async sendConsentResult(
    fcmToken: string,
    consentId: string,
    status: string,
    txnRef: string,
    jwtToken?: string,
    title?: string,
  ): Promise<boolean> {
    return this.sendToDevice(fcmToken, {
      title:
        status === 'approved' ? '✅ Consent Approved' : '❌ Consent Rejected',
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

  // Spec Step 16 — wake-up ping to operator after owner decides.
  // The payload deliberately carries NO jwt and NO pin; the operator app
  // fetches both via GET /consent_response/:consentId over TLS.
  async sendConsentResponseReady(
    fcmToken: string,
    consentId: string,
    txn: string,
    decision: string,
    title?: string,
  ): Promise<boolean> {
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

  // Spec §6.2 — after the operator app receives the firmware's
  // hid_pin_inject_ack (0602) with status=success, it tells the backend, which
  // pings the OWNER (subscriber) so the person who approved the consent learns
  // their PIN was used. Sent ONLY on success. Carries NO pin/jwt.
  async sendHidInjectSuccess(
    fcmToken: string,
    consentId: string,
    txn: string,
    operatorName: string,
    documentName: string,
    usedAtMs: number,
  ): Promise<boolean> {
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

  async sendBleResponse(
    fcmToken: string,
    blePacket: Record<string, any>,
  ): Promise<boolean> {
    return this.sendToDevice(fcmToken, {
      title: '📡 BLE Response Ready',
      body: `Status: ${blePacket.status} · Ref: ${blePacket.ref}`,
      data: {
        type: 'ble_response',
        ...Object.fromEntries(
          Object.entries(blePacket).map(([k, v]) => [k, String(v)]),
        ),
      },
    });
  }
}
