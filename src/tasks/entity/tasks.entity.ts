import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { UserEntity } from '@/users/entity/user.entity';
import { ConversationsEntity } from '@/conversations/entity/conversations.entity';

@Entity('tasks')
export class TasksEntity {
  @PrimaryColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  requester_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  requester!: UserEntity;

  @Column()
  price!: number;

  @Column()
  dateline!: Date;

  @Column()
  status!: 'Posted' | 'In Progress' | 'Completed' | 'Cancelled' | 'Verifying';

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  create_at!: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  update_at!: Date;

  @OneToMany(() => ConversationsEntity, (conversation) => conversation.task)
  conversation!: ConversationsEntity[];
}
