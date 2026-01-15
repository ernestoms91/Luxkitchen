import { Transform, Type } from 'class-transformer';
import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';

export class CreateProductImageDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  })
  @IsInt()
  @Min(0)
  order?: number;
}
