import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryImageDto {
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsString()
  @IsOptional()
  url?: string;
}
