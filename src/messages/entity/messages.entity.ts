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

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  CALL_LOG = 'CALL_LOG',
}

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  conversation_id!: number;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type!: MessageType;

  @Column({ nullable: true })
  image_url?: string;

  @Column({ name: 'message', type: 'text', nullable: true })
  message!: string;

  @Column({ nullable: true })
  call_duration?: number;

  @Column()
  sender_id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: UserEntity;

  @ManyToOne(() => ConversationsEntity, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationsEntity;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}