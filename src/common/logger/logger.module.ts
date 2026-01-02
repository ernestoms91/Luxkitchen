import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport: configService.get<string>('NODE_ENV') !== 'production' ? {
            target: 'pino-pretty',
            options: { colorize: true },
          } : undefined,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
