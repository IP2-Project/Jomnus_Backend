import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "@/users/entity/user.entity";

@Entity('requester_stats')
export class RequesterStats {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  user_id!: number;

  @OneToOne(() => UserEntity, (user) => user.requesterStats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ default: 0 })
  tasks_posted!: number;

  @Column({ default: 0 })
  tasks_verified!: number;

  @Column('float', { default: 0 })
  total_spent!: number;
}