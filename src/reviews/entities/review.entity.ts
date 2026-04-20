import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assignment_id: string;

  @Column()
  reviewer_id: string;

  @Column()
  reviewee_id: string;

  @Column()
  rating: number;

  @Column()
  reliability: number;

  @Column()
  speed: number;

  @Column()
  communication: number;

  @Column()
  accuracy: number;

  @Column()
  comment: string;

  @CreateDateColumn()
  created_at: Date;
}
