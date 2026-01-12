import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  IsDate,
  IsOptional,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  description!: string;

  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsNumber()
  @Min(0)
  categoryId!: number;

  @IsBoolean()
  active!: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;
}
