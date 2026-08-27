import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    let db: 'up' | 'down' = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }

    const body = {
      status: db === 'up' ? 'ok' : 'degraded',
      service: 'Ascent.EN API',
      version: '1.0.0',
      database: db,
      timestamp: new Date().toISOString(),
    };

    // Process is up, but cloud load balancers should treat DB-down as unhealthy.
    if (db === 'down') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
