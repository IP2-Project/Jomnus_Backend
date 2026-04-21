import { Injectable } from '@nestjs/common';
import { CreateProofDto } from './dto/create-proof.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proof } from './entities/task-proof.entity';

@Injectable()
export class ProofsService {
  constructor(
    @InjectRepository(Proof)
    private readonly proofRepository: Repository<Proof>,
  ) {}

  async submitProof(createProofDto: CreateProofDto): Promise<Proof> {
    const proof = this.proofRepository.create(createProofDto);
    return await this.proofRepository.save(proof);
  }

  async getProofsByAssignmentId(assignmentId: number): Promise<Proof[]> {
    return this.proofRepository.find({
      where: { assignment_id: assignmentId },
    });
  }
}
