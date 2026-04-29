
import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ProofsService } from './proofs.service';
import { CreateProofDto } from './dto/create-proof.dto';
import { ProofStatus } from './entities/task-proof.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('proofs')
export class ProofsController {
  constructor(private readonly proofsService: ProofsService) {}

  @Post()
  async submitProof(@Body() createProofDto: CreateProofDto) {
    try {
      return await this.proofsService.submitProof(createProofDto);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async getAllProofs() {
    return this.proofsService.getAllProofs();
  }

  @Get(':assignmentId')
  async getProofsByAssignmentId(@Param('assignmentId') assignmentId: number) {
    return this.proofsService.getProofsByAssignmentId(Number(assignmentId));
  }

  @Patch(':id/approve')
  async approveProof(@Param('id') id: number) {
    return this.proofsService.updateProofStatus(id, ProofStatus.APPROVED);
  }

  @Patch(':id/reject')
  async rejectProof(@Param('id') id: number) {
    return this.proofsService.updateProofStatus(id, ProofStatus.REJECTED);
  }
}

