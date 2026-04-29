import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerificationEntity } from './entities/identity-verification.entity';
import { UserEntity } from '@/users/entity/user.entity';

@Module({
    imports:[
        TypeOrmModule.forFeature(
            [IdentityVerificationEntity, UserEntity]
        )
    ]
})
export class IdentityVerificationsModule {}
