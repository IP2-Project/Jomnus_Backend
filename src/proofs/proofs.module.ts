import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProofsController } from './proofs.controller';
import { ProofsService } from './proofs.service';
import { Proof } from './entities/proof.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proof])],
  controllers: [ProofsController],
  providers: [ProofsService],
})
export class ProofsModule {}
