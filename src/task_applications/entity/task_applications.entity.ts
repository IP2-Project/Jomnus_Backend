import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from '@/auth/entity/user.entity';
import { TasksEntity } from '@/tasks/entity/tasks.entity';

@Entity('task_applications')
export class task_applicationsEntity {
  @PrimaryColumn()
  id!: number;

  @Column()
  performer_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  performer!: UserEntity;

  @Column()
  task_id!: number;

  @ManyToOne(() => TasksEntity, { onDelete: 'CASCADE' })
  task!: TasksEntity;

  @Column()
  status!: 'Posted' | 'In Progress' | 'Completed' | 'Cancelled' | 'Verifying' | 'ACCEPTED';

  @Column()
  offerprice!: number;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  create_at!: Date;
}
