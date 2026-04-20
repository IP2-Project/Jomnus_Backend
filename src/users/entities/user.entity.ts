import { PerformerStats } from '@/stats/entities/performer-stats.entity';
import { RequesterStats } from '@/stats/entities/requester-stats.entity';
import { UserProfile } from '@/stats/entities/user-profile.entity';
import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  REQUESTER = 'REQUESTER',
  PERFORMER = 'PERFORMER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  profile_image: string;

  @Column({ default: false })
  phone_verified: boolean;

  @Column({ default: false })
  is_identity_verified: boolean;

  @Column({ default: true })
  is_performer: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.REQUESTER,
  })
  current_role: UserRole;

  @Column({ default: false })
  is_verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => UserProfile, profile => profile.user)
  profile: UserProfile;

  @OneToOne(() => PerformerStats, stats => stats.user)
  performerStats: PerformerStats;

  @OneToOne(() => RequesterStats, stats => stats.user)
  requesterStats: RequesterStats;
}