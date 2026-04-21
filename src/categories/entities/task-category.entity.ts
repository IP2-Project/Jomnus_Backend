import { TaskEntity } from '@/tasks/entities/task.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Category } from './category.entity';

@Entity('task_categories')
@Unique(['task_id', 'category_id'])
export class TaskCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  task_id!: number;

  @Column()
  category_id!: number;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;
}