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
import { StorageModule } from '@modules/storage/storage.module';
import { ProductImagesModule } from '@modules/product-images/product-images.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    AppLoggerModule,
    AuthModule,
    CatalogModule,
    DatabaseModule,
    EmailModule,
    ProductImagesModule,
    StorageModule,
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
