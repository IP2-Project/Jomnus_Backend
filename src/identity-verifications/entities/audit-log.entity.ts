import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entity/user.entity';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  action!: string; // 'REQUEST_SUBMITTED', 'APPROVED', 'REJECTED', 'RESET_TO_PENDING', 'IMAGES_CLEARED'

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column()
  targetUserId!: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'targetUserId' })
  targetUser?: UserEntity;

  @Column({ nullable: true })
  adminId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'adminId' })
  admin?: UserEntity;

  @CreateDateColumn()
  createdAt!: Date;
}