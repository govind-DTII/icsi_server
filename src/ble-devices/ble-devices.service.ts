import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BleDevice } from '../entities/ble-device.entity';
import { BleCharacteristic } from '../entities/ble-characteristic.entity';
import { DeviceAssignment } from '../entities/device-assignment.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class BleDevicesService {
  constructor(
    @InjectRepository(BleDevice)
    private bleDeviceRepo: Repository<BleDevice>,
    @InjectRepository(BleCharacteristic)
    private bleCharRepo: Repository<BleCharacteristic>,
    @InjectRepository(DeviceAssignment)
    private assignRepo: Repository<DeviceAssignment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findAllForOperator(operatorId: string): Promise<BleDevice[]> {
    const assignments = await this.assignRepo.find({
      where: { operator: { id: operatorId }, isActive: true },
      relations: ['bleDevice', 'bleDevice.characteristics'],
    });
    return assignments.map((a) => a.bleDevice);
  }

  async findOne(deviceId: string): Promise<BleDevice> {
    const device = await this.bleDeviceRepo.findOne({
      where: { deviceId, isActive: true },
      relations: [
        'characteristics',
        'owner',
        'assignments',
        'assignments.operator',
      ],
    });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    return device;
  }

  async getConfigForOperator(deviceId: string, operatorId: string) {
    const assignment = await this.assignRepo.findOne({
      where: {
        bleDevice: { deviceId },
        operator: { id: operatorId },
        isActive: true,
      },
      relations: [
        'bleDevice',
        'bleDevice.characteristics',
        'bleDevice.owner',
        'operator',
      ],
    });
    if (!assignment)
      throw new ForbiddenException(
        `No active assignment for device ${deviceId}`,
      );

    const d = assignment.bleDevice;
    const charMap: Record<string, string> = {};
    for (const c of d.characteristics) {
      if (c.isActive) charMap[c.name] = c.uuid;
    }

    return {
      deviceId: d.deviceId,
      advertisementName: d.advertisementName,
      serviceUuid: d.serviceUuid,
      characteristics: charMap,
      protocolVersion: d.protocolVersion,
      bleVersion: d.bleVersion,
      tlsVersion: d.tlsVersion,
      timeouts: {
        disconnectSec: d.disconnectTimeoutSec,
        heartbeatSec: d.heartbeatIntervalSec,
        staleHeartbeatSec: d.staleHeartbeatSec,
        ackSec: d.ackTimeoutSec,
        maxRetries: d.maxAckRetries,
        consentDecisionNormalSec: d.consentDecisionNormalSec,
        consentDecisionHighSec: d.consentDecisionHighSec,
        hidInjectWindowSec: d.hidInjectWindowSec,
        rtcDriftThresholdSec: d.rtcDriftThresholdSec,
        maxPacketBytes: d.maxPacketBytes,
      },
      ownerInfo: d.owner ? { id: d.owner.id, name: d.owner.name } : null,
      operatorInfo: {
        id: assignment.operator.id,
        name: assignment.operator.name,
      },
    };
  }

  async updateStatus(
    deviceId: string,
    status: { isPaired?: boolean; rssi?: string; batteryPct?: number },
  ): Promise<BleDevice> {
    const device = await this.bleDeviceRepo.findOne({ where: { deviceId } });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    if (status.isPaired !== undefined) device.isPaired = status.isPaired;
    if (status.rssi !== undefined) device.rssi = status.rssi;
    if (status.batteryPct !== undefined) device.batteryPct = status.batteryPct;
    device.lastSeenAt = new Date();
    return this.bleDeviceRepo.save(device);
  }

  async assignOperator(
    deviceId: string,
    operatorId: string,
    assignedBy: string,
  ): Promise<DeviceAssignment> {
    const device = await this.bleDeviceRepo.findOne({ where: { deviceId } });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    const operator = await this.userRepo.findOne({ where: { id: operatorId } });
    if (!operator) throw new NotFoundException('Operator not found');

    const existing = await this.assignRepo.findOne({
      where: {
        bleDevice: { deviceId },
        operator: { id: operatorId },
        isActive: true,
      },
      relations: ['bleDevice', 'operator'],
    });
    if (existing) return existing;

    // One active device per operator: the mobile app has no device picker and
    // resolves the operator's *first* active assignment, so a re-assignment must
    // never leave two active rows. Deactivate any other active assignment first.
    await this.assignRepo.update(
      { operator: { id: operatorId }, isActive: true },
      { isActive: false },
    );

    const assignment = this.assignRepo.create({
      bleDevice: device,
      operator,
      isActive: true,
      assignedBy,
    });
    return this.assignRepo.save(assignment);
  }

  async removeOperator(deviceId: string, operatorId: string): Promise<void> {
    const assignment = await this.assignRepo.findOne({
      where: {
        bleDevice: { deviceId },
        operator: { id: operatorId },
        isActive: true,
      },
      relations: ['bleDevice', 'operator'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    assignment.isActive = false;
    await this.assignRepo.save(assignment);
  }
}
