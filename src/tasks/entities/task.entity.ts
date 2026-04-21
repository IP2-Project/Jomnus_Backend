import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '@/users/entity/user.entity';
import { ConversationsEntity } from '@/conversations/entity/conversations.entity';
import { TaskCategory } from '@/categories/entities/task-category.entity';

export enum TaskStatus {
  POSTED = 'POSTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PARTIAL_COMPLETED = 'PARTIAL_COMPLETED',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED',
}

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column()
  requester_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester!: UserEntity;

  @Column('float')
  price!: number;

  @Column({ type: 'timestamp' })
  deadline!: Date;

  @Column({ default: 1 })
  required_workers!: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.POSTED,
  })
  status!: TaskStatus;

  @Column({ nullable: true })
  location_text!: string;

  @Column({ type: 'float', nullable: true })
  latitude!: number;

  @Column({ type: 'float', nullable: true })
  longitude!: number;

  // ================= RELATIONS =================

  @OneToMany(() => ConversationsEntity, (conversation) => conversation.task)
  conversations!: ConversationsEntity[];

  @OneToMany(() => TaskCategory, (tc) => tc.task)
  taskCategories!: TaskCategory[];

  // ================= TIMESTAMP =================

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}