
import { Body, Controller, Get, HttpException, HttpStatus, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ProofsService } from './proofs.service';
import { CreateProofDto } from './dto/create-proof.dto';
import { ProofStatus } from './entities/task-proof.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';
import type { RequestWithUser } from '@/common/interfaces/request-with-user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        mkdirSync('./uploads/proofs', { recursive: true });
        callback(null, './uploads/proofs');
      },
    }),
  }))
  async uploadProof(
    @Body() body: CreateProofDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      return await this.proofsService.submitProof({
        ...body,
        file_url: file ? `/uploads/proofs/${file.filename}` : body.file_url,
      });
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':assignmentId')
  findByAssignment(
      @Param('assignmentId') assignmentId: number,
  ) {
      return this.proofsService.findByAssignment(
          Number(assignmentId),
      );
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
  async approveProof(@Param('id') id: number, @Req() req: RequestWithUser) {
    return this.proofsService.updateProofStatus(id, ProofStatus.APPROVED, req.user);
  }

  @Patch(':id/reject')
  async rejectProof(@Param('id') id: number, @Req() req: RequestWithUser) {
    return this.proofsService.updateProofStatus(id, ProofStatus.REJECTED, req.user);
  }
}
