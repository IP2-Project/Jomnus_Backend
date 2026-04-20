import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "@/users/entities/user.entity";

@Entity('requester_stats')
export class RequesterStats {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, user => user.requesterStats)
  @JoinColumn()
  user: User;

  @Column({ default: 0 })
  tasks_posted: number;

  @Column({ default: 0 })
  tasks_verified: number;

  @Column('float', { default: 0 })
  total_spent: number;
}