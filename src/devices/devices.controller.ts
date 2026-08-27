import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './register-device.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register FCM/APNs token for push notifications' })
  async register(@Body() dto: RegisterDeviceDto, @Request() req) {
    return this.devicesService.register(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List devices for current user' })
  async getAll(@Request() req) {
    return this.devicesService.findByOwner(req.user.userId);
  }
}
