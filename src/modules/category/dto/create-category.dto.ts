import { Transform } from 'class-transformer';
import { IsNumber, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value.toLowerCase())
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null) // solo valida si no es null
  @IsNumber({}, { message: 'parentId must be a number or null' })
  @Min(0)
  parentId: number | null;

}