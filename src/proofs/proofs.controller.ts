import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ProofsService } from './proofs.service';
import { CreateProofDto } from './dto/create-proof.dto';

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

  @Get(':assignmentId')
  async getProofsByAssignmentId(
    @Param('assignmentId') assignmentId: number, 
  ) {
    return this.proofsService.getProofsByAssignmentId(Number(assignmentId));
  }
}
