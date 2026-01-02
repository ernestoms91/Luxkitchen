import { IsString } from 'class-validator';

export class ActivateUserDto {
  @IsString()
  token!: string;
}
