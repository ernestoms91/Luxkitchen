import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto, ResetPasswordDto } from '@modules/auth/dto/';
import { DATABASE_CONNECTION } from '@common/database/db.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import schema from '@common/database/schemas';
import { eq, or, sql } from 'drizzle-orm';
import {
  ValidRoles,
  JwtPayload,
  ResetPasswordPayload,
} from '@modules/auth/interfaces/';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailService } from '@modules/email/email.service';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { LoginUserDto } from '@/modules/auth/dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { password } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = randomBytes(32).toString('hex');
    const ONE_DAY = 1000 * 60 * 60 * 24;
    const expiresAt = new Date(Date.now() + ONE_DAY);

    const createdUser = await this.database.transaction(async (tx) => {
      // 1. Crear usuario
      const [user] = await tx
        .insert(schema.users)
        .values({
          username: createUserDto.username,
          tokenVersion: 0,
          name: createUserDto.name,
          lastname: createUserDto.lastname,
          email: createUserDto.email,
          password: hashedPassword,
          roles: [ValidRoles.USER],
          location: createUserDto.location,
        })
        .returning();
      this.logger.log(
        `User created with ID ${user.id} and email ${user.email}`,
      );
      // 2. Crear token
      await tx.insert(schema.activationToken).values({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      });

      // 3. Enviar email (dentro de la transacción)
      const activationUrl = `${this.configService.get<string>('CORS_ORIGIN')}/activate?token=${token}`;
      try {
        await this.emailService.sendVerificationEmail(
          user.email,
          user.name,
          `Activa tu cuenta en ${this.configService.get<string>('CORS_ORIGIN')}`,
          activationUrl,
          false,
        );
        this.logger.log(`Activation email sent to user ID ${user.id}`);
      } catch (err) {
        this.logger.error('Error al enviar correo:', err);
        // Forzamos rollback
        throw new Error('Email sending failed. Rolling back transaction.');
      }

      return user;
    });

    // 4. Devolver respuesta (solo si todo fue bien)
    return {
      id: createdUser.id.toString(),
      name: createdUser.name,
      lastname: createdUser.lastname,
      email: createdUser.email,
      username: createdUser.username as string,
      roles: createdUser.roles as string[],
      location: createdUser.location as string,
    };
  }

  async activateAccount(userId: number) {
    // Activar usuario y borrar token
    const result = await this.database.transaction(async (tx) => {
      // Activar usuario
      const [updatedUser] = await tx
        .update(schema.users)
        .set({ active: true })
        .where(eq(schema.users.id, userId))
        .returning();

      if (!updatedUser) {
        this.logger.warn(`Attempt to activate non-existing user ID ${userId}`);
        throw new NotFoundException('User not found');
      }
      this.logger.log(`User ID ${userId} activated`);
      // Borrar token de activación
      await tx
        .delete(schema.activationToken)
        .where(eq(schema.activationToken.user_id, userId));

      return updatedUser;
    });

    // Opcional: generar JWT si quieres que se loguee automáticamente
    const tokenJwt = this.getJwtToken({
      id: result.id,
      tokenVersion: result.tokenVersion,
    });

    this.logger.log(`JWT generated for user ID ${result.id} after activation`);

    return {
      token: tokenJwt,
      tokenVersion: result.tokenVersion,
      id: result.id.toString(),
      name: result.name,
      lastname: result.lastname,
      email: result.email,
      username: result.username as string,
      location: result.location as string,
      roles: result.roles as string[],
    };
  }

  async resendActivation(email: string): Promise<void> {
    const [user] = await this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!user) {
      this.logger.warn(
        `Resend activation requested for non-existing email: ${email}`,
      );
      throw new NotFoundException('User with this email not found');
    }

    if (user.active) {
      this.logger.warn(
        `Resend activation requested for already activated user ID ${user.id}`,
      );
      throw new BadRequestException('Account is already activated');
    }

    // Buscar token existente
    const [existingToken] = await this.database
      .select()
      .from(schema.activationToken)
      .where(eq(schema.activationToken.user_id, user.id));

    // Si existe y aún es válido → NO reenviar
    if (existingToken && existingToken.expires_at > new Date()) {
      this.logger.log(
        `Activation email re-send avoided for user ID ${user.id} due to valid existing token`,
      );
      throw new BadRequestException(
        'An activation email was already sent. Please check your inbox.',
      );
    }

    // Si existe pero está expirado → eliminarlo
    if (existingToken) {
      await this.database
        .delete(schema.activationToken)
        .where(eq(schema.activationToken.user_id, user.id));
      this.logger.log(
        `Expired activation token deleted for user ID ${user.id}`,
      );
    }

    // Crear nuevo token
    const token = randomBytes(32).toString('hex');
    const ONE_DAY = 1000 * 60 * 60 * 24;
    const expiresAt = new Date(Date.now() + ONE_DAY);

    await this.database.insert(schema.activationToken).values({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    const activationUrl = `${this.configService.get<string>(
      'CORS_ORIGIN',
    )}/activate?token=${token}`;

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      `Reenvío de activación`,
      activationUrl,
      true,
    );
    this.logger.log(`Activation email resent to user ID ${user.id}`);
  }

  async login(loginUserDto: LoginUserDto) {
    const { password, email } = loginUserDto;

    const [user] = await this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.active) {
      this.logger.warn(`Login attempt to inactive account: ${email}`);
      throw new UnauthorizedException('Account is not activated');
    }

    this.logger.log(`User logged in: ${user.id}`);

    return {
      token: this.getJwtToken({ id: user.id, tokenVersion: user.tokenVersion }),
      tokenVersion: user.tokenVersion,
      id: user.id.toString(),
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      username: user.username as string,
      roles: user.roles as string[],
      location: user.location as string,
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  async existsByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<boolean> {
    const result = await this.database
      .select()
      .from(schema.users)
      .where(
        or(eq(schema.users.email, email), eq(schema.users.username, username)),
      );
    return result.length > 0;
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    this.logger.log(`Change password requested for user ID ${userId}`);
    const [user] = await this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) {
      this.logger.warn(`User not found for change password with ID ${userId}`);
      throw new NotFoundException();
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isValid) {
      this.logger.warn(
        `Invalid current password provided for user ID ${userId}`,
      );
      throw new UnauthorizedException('Invalid current password');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.tokenVersion += 1; // Invalidate existing tokens

    await this.database
      .update(schema.users)
      .set({ password: user.password, tokenVersion: user.tokenVersion })
      .where(eq(schema.users.id, userId));

    this.logger.log(`Password changed successfully for user ID ${userId}`);
  }

  async forgotPassword(email: string) {
    const user = await this.database.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      this.logger.warn(
        `Forgot password requested for non-existing email: ${email}`,
      );
      return;
    }

    const token = this.jwtService.sign(
      { sub: user.id, type: 'reset-password' },
      { expiresIn: '15m' },
    );

    const resetUrl = `${this.configService.get<string>(
      'CORS_ORIGIN',
    )}/reset-password?token=${token}`;

    await this.emailService.sendResetPasswordEmail(
      user.email,
      user.name,
      'Reset password',
      resetUrl,
    );
    this.logger.log(`Reset password email sent to user ID ${user.id}`);
  }

  async resetPassword(userId: number, newPassword: string) {
    this.logger.log(`Reset password requested for user ID ${userId}`);

    // Hasheamos la contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizamos en la base de datos
    const result = await this.database
      .update(schema.users)
      .set({
        password: hashedPassword,
        tokenVersion: sql`${schema.users.tokenVersion} + 1`, // invalidar tokens antiguos
      })
      .where(eq(schema.users.id, userId))
      .returning({ id: schema.users.id });

    if (result.length === 0) {
      this.logger.warn(
        `Reset password failed: User not found with ID ${userId}`,
      );
      throw new BadRequestException('User not found');
    }

    this.logger.log(`Password reset successfully for user ID ${userId}`);
  }
}
