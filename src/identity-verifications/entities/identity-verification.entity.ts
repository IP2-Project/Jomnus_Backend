import {
  Column,
  CreateDateColumn,
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

  // ================= USER =================

  @Column()
  user_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  // ================= FILES =================

  @Column()
  id_card_url!: string;

  @Column()
  selfie_url!: string;

  // ================= STATUS =================

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status!: VerificationStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string;

  // ================= REVIEW =================

  @Column({ nullable: true })
  reviewed_by?: number;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: UserEntity;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at?: Date;

  // ================= TIME =================

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}