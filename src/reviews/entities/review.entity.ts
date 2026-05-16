import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
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

@Entity('reviews')
@Unique(['assignment_id'])
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  assignment_id!: number;

  @Column()
  reviewer_id!: number;

  @Column()
  reviewee_id!: number;

  @Column()
  rating!: number;

  @Column()
  reliability!: number;

  @Column()
  speed!: number;

  @Column()
  communication!: number;

  @Column()
  accuracy!: number;

  @Column()
  comment!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => TaskAssignmentEntity)
  @JoinColumn({ name: 'assignment_id' })
  assignment!: TaskAssignmentEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewee_id' })
  reviewee!: UserEntity;
}
