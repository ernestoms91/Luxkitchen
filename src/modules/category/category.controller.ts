import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { CategoryService } from '@/modules/category/category.service';
import { CreateCategoryDto, FindCategoryDto } from '@modules/category/dto';
import { InferSelectModel } from 'drizzle-orm';
import { categoriesSchema } from '@/modules/category/entities/category.entity';
import { Auth } from '@/modules/auth/decorators';
import { SuccessResponseDto } from '@/common/dto/success-response.dto';

type Category = InferSelectModel<typeof categoriesSchema>;

@Controller('v1/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Auth()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<SuccessResponseDto<Category>> {
    const result = await this.categoryService.create(createCategoryDto);
    return {
      ok: true,
      message: 'Category created successfully',
      data: result,
    };
  }

  @Get()
  @Auth()
  async findAll(
    @Query() query: FindCategoryDto, // Usa el DTO extendido con filtros
  ): Promise<SuccessResponseDto> {
    const result = await this.categoryService.findAll(query);
    return {
      ok: true,
      message: 'Categories retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Auth()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<Category>> {
    const category = await this.categoryService.findOne(id);
    return {
      ok: true,
      message: 'Category retrieved successfully',
      data: category,
    };
  }

  @Put(':id')
  @Auth()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: CreateCategoryDto,
  ): Promise<SuccessResponseDto> {
    const category = await this.categoryService.findOne(id);
    const updatedCategory = await this.categoryService.update(
      category,
      updateCategoryDto,
    );

    return {
      ok: true,
      message: 'Category updated successfully',
      data: updatedCategory,
    };
  }

  @Delete(':id')
  @Auth()
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto> {
    const category = await this.categoryService.findOne(id);
    await this.categoryService.delete(category.id);
    return {
      ok: true,
      message: 'Category permanently deleted',
    };
  }
}
