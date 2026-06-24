import { User } from './user.entity';
export declare class Device {
    id: string;
    deviceName: string;
    macAddress: string;
    fcmToken: string;
    apnsToken: string;
    platform: string;
    isPaired: boolean;
    deviceType: string;
    owner: User;
    createdAt: Date;
}
