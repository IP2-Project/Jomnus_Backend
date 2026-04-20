import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('task_proofs')
export class Proof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assignment_id: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  file_url?: string;

  @Column({ nullable: true })
  text_content?: string;

  @CreateDateColumn()
  created_at: Date;
}
