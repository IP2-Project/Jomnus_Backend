import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { MessageEntity } from '@/messages/entity/messages.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';

@Entity('conversations')
export class ConversationsEntity {
  // @PrimaryColumn()
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  task_id!: number;


  @JoinColumn({ name: 'task_id' })
  @ManyToOne(() => TaskEntity, (task) => task.conversations, {
    onDelete: 'CASCADE',
  })
  task!: TaskEntity;

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages!: MessageEntity[];

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
