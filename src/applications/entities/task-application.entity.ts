import { TaskEntity } from '@/tasks/entities/task.entity';
import { UserEntity } from '@/users/entity/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('task-applications')
@Unique(['task_id', 'performer_id'])
export class TaskApplicationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  task_id!: number;

  @Column()
  performer_id!: number;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status!: ApplicationStatus;

  @Column('float')
  offered_price!: number;

  @CreateDateColumn({ name: 'applied_at' })
  applied_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'performer_id' })
  performer!: UserEntity;

}