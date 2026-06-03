import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConversationsEntity } from '@/conversations/entity/conversations.entity';
import { UserEntity } from '@/users/entity/user.entity';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  conversation_id!: number;

  @Column({ nullable: true })
  image_url?: string;

  @ManyToOne(
    () => ConversationsEntity,
    (conversation) => conversation.messages,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationsEntity;

  @Column()
  sender_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: UserEntity;

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
