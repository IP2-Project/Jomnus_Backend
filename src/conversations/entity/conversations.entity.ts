import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { MessageEntity } from '@/messages/entity/messages.entity';
import { TasksEntity } from '@/tasks/entity/tasks.entity';

@Entity('conversations')
export class ConversationsEntity {
  @PrimaryColumn()
  id!: number;

  @Column()
  task_id!: number;

  @ManyToOne(() => TasksEntity, (task) => task.conversation, {
    onDelete: 'CASCADE',
  })
  task!: TasksEntity;

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages!: MessageEntity[];

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
