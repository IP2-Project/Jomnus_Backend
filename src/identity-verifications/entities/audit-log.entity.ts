import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entity/user.entity';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  action!: string; // 'APPROVED', 'REJECTED', or 'RESET'

  @Column({ type: 'text', nullable: true })
  reason!: string;

  @Column()
  targetUserId!: number; // The user being reviewed

  @Column()
  adminId!: number; // The admin doing the review

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'adminId' })
  admin!: UserEntity;

  @CreateDateColumn()
  createdAt!: Date;
}