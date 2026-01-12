
import { IsInt, Min } from 'class-validator';

export class UpdateProductImageOrderDto {
  @IsInt()
  @Min(0)
  order: number;
}

