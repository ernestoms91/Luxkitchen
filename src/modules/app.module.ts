import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '@config/config.validation';
import { AppLoggerModule } from '@/common/logger/logger.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { DatabaseModule } from '@/common/database/db.module';
import { AuthModule } from '@modules/auth/auth.module';
import { EmailModule } from '@modules/email/email.module';
import { ThrottlerConfigModule } from '@/common/throttler/throttler.module';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';

@Module({
  imports: [
    AppLoggerModule,
    AuthModule,
    DatabaseModule,
    EmailModule,
    ThrottlerConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,

      // Carga el .env según el entorno
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,

      // Validación de variables de entorno
      validationSchema,
    }),

  ],
  providers: [HttpExceptionFilter, LoggingInterceptor],
})
export class AppModule {}
