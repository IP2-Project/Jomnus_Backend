import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { PerformerStats } from '@/stats/entities/performer-stats.entity';
import { RequesterStats } from '@/stats/entities/requester-stats.entity';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';

export enum UserRole {
  REQUESTER = 'REQUESTER',
  PERFORMER = 'PERFORMER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ name: 'FullName' })
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage?: string;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified!: boolean;

  @Column({ name: 'is_identity_verified', default: false })
  isIdentityVerified!: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ name: 'is_performer', default: true })
  isPerformer!: boolean;

  @Column({
    name: 'current_role',
    type: 'enum',
    enum: UserRole,
    default: UserRole.REQUESTER,
  })
  currentRole!: UserRole;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ name: 'location_text', nullable: true })
  locationText?: string;

  @Column({ type: 'float', nullable: true })
  latitude?: number;

  @Column({ type: 'float', nullable: true })
  longitude?: number;

  // ================= AUTH =================

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  @Exclude()
  refreshToken?: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  otp?: string | null;

  @Column({ name: 'otp_expiry', type: 'timestamp', nullable: true })
  @Exclude()
  otpExpiry?: Date | null;

  // ================= RELATIONS =================

  @OneToOne(() => PerformerStats, (stats) => stats.user)
  @JoinColumn()
  performerStats!: PerformerStats;

  @OneToOne(() => RequesterStats, (stats) => stats.user)
  @JoinColumn()
  requesterStats!: RequesterStats;

  @OneToMany(
    () => IdentityVerificationEntity,
    (verification) => verification.user,
  )
  identityVerifications!: IdentityVerificationEntity[];

  // ================= PASSWORD =================

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}