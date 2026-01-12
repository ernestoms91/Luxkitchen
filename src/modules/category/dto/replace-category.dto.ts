import { IsOptional, IsInt, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReplaceCategoryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => (value === null ? null : Number(value))) // convierte string a number o null
  newCategoryId: number | null;
}
