import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() deviceName: string;
  @Column({ nullable: true }) macAddress: string;
  @Column({ nullable: true }) fcmToken: string;
  @Column({ nullable: true }) apnsToken: string;
  @Column({ default: 'android' }) platform: string;
  @Column({ default: false }) isPaired: boolean;
  @Column({ default: 'BLE Simulator' }) deviceType: string;
  @ManyToOne(() => User) owner: User;
  @CreateDateColumn() createdAt: Date;
}
