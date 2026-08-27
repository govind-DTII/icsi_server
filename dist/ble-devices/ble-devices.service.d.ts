import { Repository } from 'typeorm';
import { BleDevice } from '../entities/ble-device.entity';
import { BleCharacteristic } from '../entities/ble-characteristic.entity';
import { DeviceAssignment } from '../entities/device-assignment.entity';
import { User } from '../entities/user.entity';
export declare class BleDevicesService {
    private bleDeviceRepo;
    private bleCharRepo;
    private assignRepo;
    private userRepo;
    constructor(bleDeviceRepo: Repository<BleDevice>, bleCharRepo: Repository<BleCharacteristic>, assignRepo: Repository<DeviceAssignment>, userRepo: Repository<User>);
    findAllForOperator(operatorId: string): Promise<BleDevice[]>;
    findOne(deviceId: string): Promise<BleDevice>;
    getConfigForOperator(deviceId: string, operatorId: string): Promise<{
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
    updateStatus(deviceId: string, status: {
        isPaired?: boolean;
        rssi?: string;
        batteryPct?: number;
    }): Promise<BleDevice>;
    assignOperator(deviceId: string, operatorId: string, assignedBy: string): Promise<DeviceAssignment>;
    removeOperator(deviceId: string, operatorId: string): Promise<void>;
}
