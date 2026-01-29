import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryImageDto } from './create-category-image.dto';

export class UpdateCategoryImageDto extends PartialType(CreateCategoryImageDto) {}
