import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto  {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'The password must include at least one uppercase letter, one lowercase letter, and one number or symbol',
  })
  password: string;
}
