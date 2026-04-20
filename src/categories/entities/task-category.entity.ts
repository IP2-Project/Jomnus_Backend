import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('task_categories')
export class TaskCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  task_id: number;

  @Column()
  category_id: number;
}