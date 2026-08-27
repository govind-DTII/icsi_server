import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './register-device.dto';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    register(dto: RegisterDeviceDto, req: any): Promise<{
        deviceId: string;
        registered: boolean;
        platform: string;
    }>;
    getAll(req: any): Promise<import("../entities/device.entity").Device[]>;
}
