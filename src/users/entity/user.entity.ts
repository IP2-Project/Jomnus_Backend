import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Exclude, Expose } from 'class-transformer'; 
import * as bcrypt from 'bcrypt';
import { PerformerStats } from '@/stats/entities/performer-stats.entity';
import { RequesterStats } from '@/stats/entities/requester-stats.entity';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { Review } from '@/reviews/entities/review.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';

export enum UserRole {
  REQUESTER = 'REQUESTER',
  PERFORMER = 'PERFORMER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'active',
  BANNED = 'banned',
}

@Entity('users')
export class UserEntity extends BaseEntity {
  @Expose() // 👈 CRITICAL: Unlocks full name from interceptor stripping
  @Column({ name: 'FullName' })
  fullName!: string;

  @Expose() // 👈 CRITICAL: Unlocks email from interceptor stripping
  @Column({ unique: true })
  email!: string;

  @Exclude()
  @Column()
  password!: string;

  @Expose() // Allow phone to pass through if needed later
  @Column({ nullable: true })
  phone?: string;

  @Expose() // 👈 CRITICAL: Unlocks the profile image paths
  @Column({ name: 'profile_image', nullable: true })
  profileImage?: string;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified!: boolean;

  @Column({ name: 'is_identity_verified', default: false })
  isIdentityVerified!: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Exclude({ toPlainOnly: true }) 
  @Column({ name: 'is_performer', default: false })
  isPerformer!: boolean;

  @Column({
    name: 'current_role',
    type: 'enum',
    enum: UserRole,
    default: UserRole.REQUESTER,
  })
  currentRole!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @OneToMany(() => TaskEntity, (task) => task.requester)
  tasks!: TaskEntity[];

  @OneToMany(() => Review, (review) => review.reviewer)
  reviewsGiven!: Review[];

  @OneToMany(() => Review, (review) => review.reviewee)
  reviewsReceived!: Review[];

  // --- FIGMA VIRTUAL FIELDS ---
  // Added @Expose so these stay visible during serialization
  @Expose()
  verificationStatus?: string;

  @Expose()
  displayStatus?: string;

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

  @Exclude()
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken?: string | null;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  otp?: string | null;

  @Exclude()
  @Column({ name: 'otp_expiry', type: 'timestamp', nullable: true })
  otpExpiry?: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToOne(() => PerformerStats, (stats) => stats.user)
  performerStats!: PerformerStats;

  @OneToOne(() => RequesterStats, (stats) => stats.user)
  requesterStats!: RequesterStats;

  @OneToMany(
    () => IdentityVerificationEntity,
    (verification) => verification.user,
  )
  identityVerifications!: IdentityVerificationEntity[];

  @OneToMany(() => TaskApplicationEntity, (app) => app.performer)
  applications!: TaskApplicationEntity[];

  @OneToMany(() => TaskAssignmentEntity, (assignment) => assignment.performer)
  assignments!: TaskAssignmentEntity[];

  @OneToMany(() => TaskEntity, task => task.user)
  tasks: TaskEntity[];

  @OneToMany(() => Review, review => review.reviewer)
reviewsGiven!: Review[];

@OneToMany(() => Review, review => review.reviewee)
reviewsReceived!: Review[];

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