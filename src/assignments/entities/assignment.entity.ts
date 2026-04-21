import { TaskEntity } from '@/tasks/entities/task.entity';
import { UserEntity } from '@/users/entity/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED',
}

@Entity('task-assignments')
export class TaskAssignmentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  task_id!: number;

  @Column()
  performer_id!: number;

  @Column()
  application_id!: number;

  @Column('float')
  accepted_price!: number;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.IN_PROGRESS,
  })
  status!: AssignmentStatus;

  @Column({ default: false })
  is_verified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verified_at?: Date;

  @Column({ nullable: true })
  cancelled_by?: number;

  @Column({ nullable: true })
  cancel_reason?: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => TaskEntity)
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'performer_id' })
  performer!: UserEntity;


}