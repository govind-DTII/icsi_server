import { TamperService } from './tamper.service';
import { CreateTamperEventDto } from './dto/create-tamper-event.dto';
export declare class TamperController {
    private readonly tamperService;
    constructor(tamperService: TamperService);
    log(dto: CreateTamperEventDto): Promise<{
        success: boolean;
        event: import("./entities/tamper-event.entity").TamperEvent;
    }>;
}
