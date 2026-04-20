import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskStatus {
  POSTED = 'POSTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PARTIAL_COMPLETED = 'PARTIAL_COMPLETED',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  requester_id: number;

  @Column('float')
  price: number;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @Column({ default: 1 })
  required_workers: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.POSTED,
  })
  status: TaskStatus;

  @Column({ nullable: true })
  location_text: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}