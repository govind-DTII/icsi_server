import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { LoginDto } from './login.dto';
import { AuditService } from '../audit/audit.service';
export declare class AuthService {
    private userRepo;
    private jwtService;
    private config;
    private auditService;
    constructor(userRepo: Repository<User>, jwtService: JwtService, config: ConfigService, auditService: AuditService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: Partial<User>;
    }>;
}
