import {
  BadRequestException,
  Delete,
  Injectable,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepo: Repository<CategoryEntity>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.categoryRepo.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Category already exists');
    }

    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  findAll() {
    return this.categoryRepo.find();
  }

  findByIds(ids: number[]) {
    return this.categoryRepo.findBy({ id: In(ids) });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.categoryRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const category = await this.categoryRepo.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.categoryRepo.delete(id);

    return { message: 'Category deleted' };
  }

  async findOne(id: number) {
    const category = await this.categoryRepo.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
