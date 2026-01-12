import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from '@modules/category/dto/create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
