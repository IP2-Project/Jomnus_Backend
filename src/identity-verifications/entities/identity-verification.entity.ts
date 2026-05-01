import {
  Column,
  CreateDateColumn,
  UpdateDateColumn, // Added this import
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '@/users/entity/user.entity';

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('identity_verifications')
export class IdentityVerificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true }) 
  user_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', nullable: true })
  id_card_url!: string | null;

  @Column({ type: 'varchar', nullable: true })
  selfie_url!: string | null;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status!: VerificationStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string | null;

  @Column({ nullable: true })
  reviewed_by?: number;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: UserEntity;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date | null;

  // Added this column to track the last activity for spam prevention
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}