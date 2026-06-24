import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit log' })
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: ['all', 'consent', 'ble', 'auth'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAll(
    @Request() req,
    @Query('filter') filter?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll(
      req.user.userId,
      req.user.role,
      filter,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
