import { Injectable } from '@nestjs/common';
import { CreateProofDto } from './dto/create-proof.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proof } from './entities/proof.entity';

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

  async getProofsByAssignmentId(assignmentId: string): Promise<Proof[]> {
    return await this.proofRepository.find({ where: { assignment_id: assignmentId } });
  }
}
