import { BleDevice } from './ble-device.entity';
import { User } from './user.entity';
export declare class DeviceAssignment {
    id: string;
    bleDevice: BleDevice;
    operator: User;
    isActive: boolean;
    assignedBy: string;
    assignedAt: Date;
}
