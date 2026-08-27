import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { BleDevice } from './ble-device.entity';
import { User } from './user.entity';

@Entity('device_assignments')
export class DeviceAssignment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => BleDevice, (d) => d.assignments) bleDevice: BleDevice;
  @ManyToOne(() => User) operator: User;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) assignedBy: string;
  @CreateDateColumn() assignedAt: Date;
}
