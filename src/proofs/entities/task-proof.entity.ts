import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum ProofType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  RECEIPT = 'RECEIPT',
  LOCATION = 'LOCATION',
}

export enum ProofStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('task_proofs')
export class Proof {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  assignment_id!: number;

  @ManyToOne(() => TaskAssignmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: TaskAssignmentEntity;

  @Column({
    type: 'enum',
    enum: ProofType,
  })
  type!: ProofType;

  @Column({
    type: 'enum',
    enum: ProofStatus,
    default: ProofStatus.PENDING,
  })
  status!: ProofStatus;

  @Column({ nullable: true })
  file_url?: string;

  @Column({ nullable: true })
  text_content?: string;

  @CreateDateColumn()
  created_at!: Date;
}