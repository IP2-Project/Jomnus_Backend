import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "@/users/entity/user.entity";

@Entity('performer_stats')
export class PerformerStats {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  user_id!: number;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ default: 0 })
  completed_tasks!: number;

  @Column('float', { default: 0 })
  avg_rating!: number;

  @Column('float', { default: 0 })
  success_rate!: number;

  @Column('float', { default: 0 })
  total_earnings!: number;

  @Column({ nullable: true })
  response_time!: number;
}