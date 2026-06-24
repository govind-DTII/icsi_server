import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { User } from '../entities/user.entity';
import { RegisterDeviceDto } from './register-device.dto';
export declare class DevicesService {
    private deviceRepo;
    private userRepo;
    constructor(deviceRepo: Repository<Device>, userRepo: Repository<User>);
    register(userId: string, dto: RegisterDeviceDto): Promise<{
        deviceId: string;
        registered: boolean;
        platform: string;
    }>;
    findByOwner(userId: string): Promise<Device[]>;
}
