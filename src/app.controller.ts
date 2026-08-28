import { Controller, Get, Post, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { AutoSeedService } from './database/auto-seed.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    private readonly autoSeedService: AutoSeedService,
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

    if (db === 'down') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }

  @Post('seed')
  async seed() {
    await this.autoSeedService.onApplicationBootstrap();
    return {
      message: 'Database schema synchronized and demo users seeded successfully!',
      timestamp: new Date().toISOString(),
    };
  }
}
