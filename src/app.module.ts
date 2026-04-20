import { webcrypto } from 'crypto';

// Polyfill for crypto.randomUUID in TypeORM
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TasksModule } from './tasks/tasks.module';
import { CategoriesModule } from './categories/categories.module';
import { AssignmentsModule } from './assignments/assignments.module';
// import { WorkflowModule } from './workflow/workflow.module';
// import { ProofsModule } from './proofs/proofs.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TelegramModule } from './telegram/telegram.module';
import { HealthModule } from './health/health.module';
import { ApplicationsModule } from './applications/applications.module';
import { IdentityVerificationsModule } from './identity-verifications/identity-verifications.module';
import { StatsModule } from './stats/stats.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
      }),
    }),
    AuthModule,
    UsersModule,
    ProfilesModule,
    TasksModule,
    CategoriesModule,
    AssignmentsModule,
    // WorkflowModule,
    // ProofsModule,
    ReviewsModule,
    TelegramModule,
    HealthModule,
    ApplicationsModule,
    IdentityVerificationsModule,
    StatsModule,
    MessagingModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
