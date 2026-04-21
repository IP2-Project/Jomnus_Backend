import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Post()
  create(@Body() registerDto: RegisterAuthDto) {
    return this.usersService.create(registerDto);
  }
}