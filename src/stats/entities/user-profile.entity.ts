import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "@/users/entities/user.entity";

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  location_text: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;
}