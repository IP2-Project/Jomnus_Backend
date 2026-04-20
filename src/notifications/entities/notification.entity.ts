import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', nullable: true })
  user_id!: number | null;

  @Column({ type: 'int', nullable: true })
  task_id!: number | null;

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  audience!: 'user' | 'admin';

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ default: false })
  is_read!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}