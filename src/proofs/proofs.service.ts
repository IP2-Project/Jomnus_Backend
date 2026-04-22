import { Injectable } from '@nestjs/common';
import { CreateProofDto } from './dto/create-proof.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proof, ProofStatus } from './entities/task-proof.entity';

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

  async updateProofStatus(id: number, status: ProofStatus): Promise<Proof> {
    const proof = await this.proofRepository.findOne({ where: { id } });
    if (!proof) {
      throw new Error('Proof not found');
    }
    proof.status = status;
    return this.proofRepository.save(proof);
  }
}
