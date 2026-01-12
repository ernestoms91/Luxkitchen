import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';

export class CreateProductImageDto {
  @IsUUID()
  productId: string;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsString()
  contentType: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
