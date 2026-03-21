import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TasksModule } from './tasks/tasks.module';
import { CategoriesModule } from './categories/categories.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { WorkflowModule } from './workflow/workflow.module';
import { ProofsModule } from './proofs/proofs.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ProfilesModule,
    TasksModule,
    CategoriesModule,
    AssignmentsModule,
    WorkflowModule,
    ProofsModule,
    ReviewsModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
