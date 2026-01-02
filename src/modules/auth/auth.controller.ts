import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  Inject,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from '@modules/auth/auth.service';
import {
  CreateUserDto,
  LoginUserDto,
  UserResponseDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ActivateUserDto,
  ResendActivationDto,
} from '@modules/auth/dto';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { UniqueUserPipe } from '@modules/auth/pipes/unique-user.pipe';
import { Throttle } from '@nestjs/throttler';
import {
  Auth,
  GetUser,
  ResetPasswordPayloadDecorator,
} from '@modules/auth/decorators';
import { usersSchema } from '@modules/auth/entities';
import { InferSelectModel } from 'drizzle-orm';
import { ResetPasswordGuard } from '@modules/auth/guards/jwt-reset-password.guard';
import { ResetPasswordPayload } from '@modules/auth/interfaces';
import { ActivateAccountGuard } from '@modules/auth/guards/account-activate.guard';

type User = InferSelectModel<typeof usersSchema>;

@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @UsePipes(UniqueUserPipe)
  @Post('register')
  async create(
    @Body() dto: CreateUserDto,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.authService.create(dto);
    return {
      ok: true,
      message: 'User created successfully',
      data: user,
    };
  }

  @UseGuards(ActivateAccountGuard)
  @Post('activate')
  @HttpCode(200)
  async activateUser(
    @Request() req,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const userId = req.activationUserId;

    const user = await this.authService.activateAccount(userId);

    return {
      ok: true,
      message: 'Account activated successfully!',
      data: user,
    };
  }

  @Post('resend-activation')
  @HttpCode(200)
  async resendActivation(@Body() dto: ResendActivationDto) {
    await this.authService.resendActivation(dto.email);

    return {
      ok: true,
      message: 'Activation email resent successfully',
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(200)
  async loginUser(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.authService.login(loginUserDto);
    return {
      ok: true,
      message: 'Logged in successfully!',
      data: user,
    };
  }

  @Auth()
  @Patch('change-password')
  @HttpCode(200)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @GetUser() user: User,
  ): Promise<SuccessResponseDto<boolean>> {
    await this.authService.changePassword(user.id, dto);
    return {
      ok: true,
      message: 'Password updated successfully',
    };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      ok: true,
      message: 'If the email exists, reset instructions were sent',
    };
  }

  @UseGuards(ResetPasswordGuard)
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @ResetPasswordPayloadDecorator() payload: ResetPasswordPayload,
  ) {
    await this.authService.resetPassword(payload.sub, dto.password);
    return {
      ok: true,
      message: 'Password reset successfully',
    };
  }
}
