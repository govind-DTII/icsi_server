import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto } from './login.dto';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditService: AuditService,
    private readonly appLog: LoggerService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; user: Partial<User> }> {
    // Pre-session call: no BLE session exists yet, so correlate on requestId.
    const requestId = randomUUID();
    let user: User;
    const isDemoMode = this.config.get('DEMO_MODE') === 'true';

    if (isDemoMode) {
      // Deterministic role login: pick the lowest-id user for the role so an
      // operator login always resolves to USR-002 (Phase 1). This matches the
      // operator_id the consent flow expects and Fix 1's auth-binding check.
      user = await this.userRepo.findOne({
        where: { role: dto.role },
        order: { id: 'ASC' },
      });
    } else {
      if (!dto.email || !dto.password) {
        throw new UnauthorizedException('Email and password required');
      }
      user = await this.userRepo.findOne({ where: { email: dto.email } });
      if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (!user) throw new UnauthorizedException('User not found');

    try {
      await this.auditService.log({
        action: `${user.name} login — JWT issued`,
        type: 'login',
        actorId: user.id,
        actorRole: user.role,
        actorName: user.name,
        detail: `Auth API · ${isDemoMode ? 'demo one-tap' : 'email+password'}`,
      });
    } catch (e) {
      // Audit must never block login.
      this.appLog.error(`login audit failed: ${e}`, {
        service: 'auth',
        eventType: 'AUDIT_WRITE_FAILED',
        actorId: user.id,
      });
    }

    // Confirmed login — references only (no name/email/token).
    this.appLog.log('user login', {
      requestId,
      service: 'auth',
      eventType: 'LOGIN',
      actorId: user.id,
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      deviceId: user.deviceId,
      name: user.name,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        deviceId: user.deviceId,
      },
    };
  }
}
