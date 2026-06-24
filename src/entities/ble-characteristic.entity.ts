import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { BleDevice } from './ble-device.entity';

@Entity('ble_characteristics')
export class BleCharacteristic {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column() uuid: string;
  @Column() shortCode: string;
  @Column() properties: string;
  @Column() direction: string;
  @Column() purpose: string;
  @Column({ default: true }) isActive: boolean;
  @ManyToOne(() => BleDevice, (d) => d.characteristics)
  bleDevice: BleDevice;
  @CreateDateColumn() createdAt: Date;
}
