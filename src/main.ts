import { NestFactory } from '@nestjs/core';
import { AppModule } from '@modules/app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { DBService } from '@common/database/db.service';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);


  app.useLogger(app.get(Logger));

  const logger = app.get(Logger);
  const dbService = app.get(DBService);

  // Obtener ConfigService para leer variables con validación
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT') ?? 3000;

  app.useGlobalFilters(app.get(HttpExceptionFilter));

  // Esto habilita el manejo automático de señales y cierre ordenado
  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  try {
    await dbService.isHealthy();
    logger.log('Database connection OK');
  } catch (error) {
    logger.error('Database connection failed', error);
    process.exit(1);
  }

  await app.listen(port);

  logger.log(`Application running on port ${port}`);
}
bootstrap();
