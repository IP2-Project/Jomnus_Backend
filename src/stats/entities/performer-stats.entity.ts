import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "@/users/entities/user.entity";

@Entity('performer_stats')
export class PerformerStats {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, user => user.performerStats)
  @JoinColumn()
  user: User;

  @Column({ default: 0 })
  completed_tasks: number;

  @Column('float', { default: 0 })
  avg_rating: number;

  @Column('float', { default: 0 })
  success_rate: number;

  @Column('float', { default: 0 })
  total_earnings: number;

  @Column({ nullable: true })
  response_time: number;
}