import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BleDevice } from '../entities/ble-device.entity';
import { BleCharacteristic } from '../entities/ble-characteristic.entity';
import { DeviceAssignment } from '../entities/device-assignment.entity';
import { User } from '../entities/user.entity';
import { BleDevicesService } from './ble-devices.service';
import { BleDevicesController } from './ble-devices.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BleDevice,
      BleCharacteristic,
      DeviceAssignment,
      User,
    ]),
  ],
  providers: [BleDevicesService],
  controllers: [BleDevicesController],
  exports: [BleDevicesService],
})
export class BleDevicesModule {}
