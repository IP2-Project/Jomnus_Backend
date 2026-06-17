import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserEntity } from './entity/user.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersCleanupService {
  private readonly logger = new Logger(UsersCleanupService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async handlePermanentDeletion() {
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1); 

    // ADD THIS LOG:
    this.logger.debug(`Searching for users deleted before: ${oneMinuteAgo.toISOString()}`);

    const expiredUsers = await this.usersRepository.find({
    where: { 
        deletedAt: LessThan(oneMinuteAgo)
    },
    relations: ['identityVerifications'],
    withDeleted: true,
    });

    if (expiredUsers.length > 0) {
      this.logger.log(`Cleaning up files and records for ${expiredUsers.length} users.`);

      for (const user of expiredUsers) {
        // 1. Delete Profile Image
        if (user.profileImage) {
          this.deleteFile(user.profileImage);
        }

        // 2. Delete Identity Documents (ID Cards & Selfies)
        if (user.identityVerifications && user.identityVerifications.length > 0) {
          for (const verification of user.identityVerifications) {
            if (verification.id_card_url) this.deleteFile(verification.id_card_url);
            if (verification.selfie_url) this.deleteFile(verification.selfie_url);
          }
        }
      }

      // 3. Final Hard Delete from Database
      await this.usersRepository.remove(expiredUsers);
      this.logger.log(`Successfully purged ${expiredUsers.length} users and their data.`);
    }
  }

  private deleteFile(relativeFilePath: string) {
    if (relativeFilePath === 'MANUAL_BYPASS') return;

    try {
      const absolutePath = path.resolve(process.cwd(), relativeFilePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        this.logger.debug(`File deleted: ${relativeFilePath}`);
      }
      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete file ${relativeFilePath}: ${errorMessage}`);
    }
  }
}