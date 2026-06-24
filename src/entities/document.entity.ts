import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ConsentRequest } from './consent-request.entity';
import { User } from './user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() fileName: string;
  @Column() s3Key: string;
  @Column({ nullable: true }) s3Url: string;
  @ManyToOne(() => ConsentRequest) consentRequest: ConsentRequest;
  @ManyToOne(() => User) uploadedBy: User;
  @CreateDateColumn() createdAt: Date;
}
