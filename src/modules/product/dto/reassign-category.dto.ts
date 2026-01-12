import { IsInt, Min } from 'class-validator';

export class ReassignCategoryDto {
  @IsInt()
  @Min(1)
  newCategoryId: number;
}
