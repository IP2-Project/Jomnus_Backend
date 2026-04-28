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

  @Column({ unique: true }) // Ensures one user only has one verification record
  user_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  // ================= FILES =================

// Add type: 'varchar' explicitly here
  @Column({ type: 'varchar', nullable: true })
  id_card_url!: string | null;

  @Column({ type: 'varchar', nullable: true })
  selfie_url!: string | null;

  // ================= STATUS =================

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status!: VerificationStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string | null;

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