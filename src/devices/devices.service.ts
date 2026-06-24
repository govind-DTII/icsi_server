import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { User } from '../entities/user.entity';
import { RegisterDeviceDto } from './register-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async register(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<{ deviceId: string; registered: boolean; platform: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Update push tokens on the user record
    if (dto.fcmToken) user.fcmToken = dto.fcmToken;
    if (dto.apnsToken) user.apnsToken = dto.apnsToken;
    user.platform = dto.platform;
    await this.userRepo.save(user);

    // Check if the paired device (DT1001) exists for this user
    const device = await this.deviceRepo.findOne({
      where: { owner: { id: userId }, deviceName: user.deviceId ?? 'DT1001' },
      relations: ['owner'],
    });

    return {
      deviceId: user.deviceId ?? device?.deviceName ?? 'DT1001',
      registered: true,
      platform: dto.platform,
    };
  }

  async findByOwner(userId: string): Promise<Device[]> {
    const devices = await this.deviceRepo.find({
      where: { owner: { id: userId } },
      relations: ['owner'],
    });
    return devices.map((d) => {
      if (d.owner) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeOwner } = d.owner as any;
        (d as any).owner = safeOwner;
      }
      return d;
    });
  }
}
