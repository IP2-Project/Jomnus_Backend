import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TasksEntity } from '@/tasks/entity/tasks.entity';
import { UserEntity } from '@/users/entity/user.entity';

@Entity('task_assignments')
export class task_assignmentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  task_id!: number;

  @ManyToOne(() => TasksEntity, { onDelete: 'CASCADE' })
  task!: TasksEntity;

  @Column()
  performer_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  performer!: UserEntity;

  @Column()
  accpet_price!: number;

  @Column()
  status!: 'Posted' | 'In Progress' | 'Completed' | 'Cancelled' | 'Verifying';

  @Column()
  is_verified!: boolean;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  verify_at!: Date;

  @Column()
  concel_by!: number;

  @Column({ type: 'text' })
  concel_reason!: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  create_at!: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  cancel_at!: Date;
}
