import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BleDevicesService } from './ble-devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('ble-devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('BLE Devices')
export class BleDevicesController {
  constructor(private readonly service: BleDevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List active BLE devices for current operator' })
  async findAll(@Request() req) {
    return this.service.findAllForOperator(req.user.userId);
  }

  @Get(':deviceId')
  @ApiOperation({ summary: 'Get single device with all characteristics' })
  async findOne(@Param('deviceId') deviceId: string) {
    return this.service.findOne(deviceId);
  }

  @Get(':deviceId/config')
  @ApiOperation({ summary: 'Get compact BLE config for Flutter provider' })
  async getConfig(@Param('deviceId') deviceId: string, @Request() req) {
    return this.service.getConfigForOperator(deviceId, req.user.userId);
  }

  @Patch(':deviceId/status')
  @ApiOperation({ summary: 'Update device paired/rssi/battery status' })
  async updateStatus(
    @Param('deviceId') deviceId: string,
    @Body() body: { isPaired?: boolean; rssi?: string; batteryPct?: number },
  ) {
    return this.service.updateStatus(deviceId, body);
  }

  @Post(':deviceId/assign')
  @Roles('owner')
  @ApiOperation({ summary: 'Assign operator to device (Owner only)' })
  async assignOperator(
    @Param('deviceId') deviceId: string,
    @Body() body: { operatorId: string },
    @Request() req,
  ) {
    return this.service.assignOperator(
      deviceId,
      body.operatorId,
      req.user.userId,
    );
  }

  @Delete(':deviceId/assign/:operatorId')
  @Roles('owner')
  @ApiOperation({ summary: 'Remove operator assignment (Owner only)' })
  async removeOperator(
    @Param('deviceId') deviceId: string,
    @Param('operatorId') operatorId: string,
  ) {
    await this.service.removeOperator(deviceId, operatorId);
    return { removed: true };
  }
}
