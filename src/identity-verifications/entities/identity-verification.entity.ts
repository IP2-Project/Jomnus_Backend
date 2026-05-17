import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '@/users/entity/user.entity';
// 1. IMPORT Expose FROM class-transformer
import { Expose } from 'class-transformer';

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('identity_verifications')
export class IdentityVerificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // 2. ADD @Expose() HERE to prevent the interceptor from dropping the user object
  @Expose()
  @ManyToOne(() => UserEntity, (user) => user.identityVerifications, { onDelete: 'CASCADE' })
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

  // 3. ADD @Expose() HERE as well so your reviewer history data displays correctly too
  @Expose()
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: UserEntity;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}