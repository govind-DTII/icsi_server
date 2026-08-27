import { DataSource } from 'typeorm';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    private readonly dataSource;
    constructor(appService: AppService, dataSource: DataSource);
    getHello(): string;
    health(): Promise<{
        status: string;
        service: string;
        version: string;
        database: "up" | "down";
        timestamp: string;
    }>;
}
