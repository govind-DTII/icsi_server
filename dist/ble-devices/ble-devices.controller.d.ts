import { BleDevicesService } from './ble-devices.service';
export declare class BleDevicesController {
    private readonly service;
    constructor(service: BleDevicesService);
    findAll(req: any): Promise<import("../entities/ble-device.entity").BleDevice[]>;
    findOne(deviceId: string): Promise<import("../entities/ble-device.entity").BleDevice>;
    getConfig(deviceId: string, req: any): Promise<{
        deviceId: string;
        advertisementName: string;
        serviceUuid: string;
        characteristics: Record<string, string>;
        protocolVersion: string;
        bleVersion: string;
        tlsVersion: string;
        timeouts: {
            disconnectSec: number;
            heartbeatSec: number;
            staleHeartbeatSec: number;
            ackSec: number;
            maxRetries: number;
            consentDecisionNormalSec: number;
            consentDecisionHighSec: number;
            hidInjectWindowSec: number;
            rtcDriftThresholdSec: number;
            maxPacketBytes: number;
        };
        ownerInfo: {
            id: string;
            name: string;
        };
        operatorInfo: {
            id: string;
            name: string;
        };
    }>;
    updateStatus(deviceId: string, body: {
        isPaired?: boolean;
        rssi?: string;
        batteryPct?: number;
    }): Promise<import("../entities/ble-device.entity").BleDevice>;
    assignOperator(deviceId: string, body: {
        operatorId: string;
    }, req: any): Promise<import("../entities/device-assignment.entity").DeviceAssignment>;
    removeOperator(deviceId: string, operatorId: string): Promise<{
        removed: boolean;
    }>;
}
