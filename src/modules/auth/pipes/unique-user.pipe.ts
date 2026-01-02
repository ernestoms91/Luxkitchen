import {
  PipeTransform,
  Injectable,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { AuthService } from '@modules/auth/auth.service';
import { CreateUserDto } from '@modules/auth/dto/create-user.dto';

@Injectable()
export class UniqueUserPipe implements PipeTransform {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async transform(value: CreateUserDto) {
    const exists = await this.authService.existsByEmailOrUsername(
      value.email,
      value.username,
    );
    if (exists) {
      throw new ConflictException({
        ok: false,
        message: 'Email or username already in use',
      });
    }
    return value;
  }
}
