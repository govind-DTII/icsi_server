import { BleDevice } from './ble-device.entity';
export declare class BleCharacteristic {
    id: string;
    name: string;
    uuid: string;
    shortCode: string;
    properties: string;
    direction: string;
    purpose: string;
    isActive: boolean;
    bleDevice: BleDevice;
    createdAt: Date;
}
