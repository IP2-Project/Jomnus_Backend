import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateProofDto {
  @IsNotEmpty()
  @IsString()
  assignment_id: string;

  @IsNotEmpty()
  @IsEnum(['IMAGE', 'TEXT', 'RECEIPT', 'LOCATION'])
  type: string;

  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsString()
  text_content?: string;
}
