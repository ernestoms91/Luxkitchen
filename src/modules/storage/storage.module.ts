import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from '@modules/storage/storage.service';
import { S3_CLIENT } from '@modules/storage/storage.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new S3Client({
          region: config.get<string>('S3_REGION'),
          endpoint: config.get<string>('S3_ENDPOINT'),
          credentials: {
            accessKeyId: config.get<string>('S3_ACCESS_KEY')!,
            secretAccessKey: config.get<string>('S3_SECRET_KEY')!,
          },
          forcePathStyle: config.get<boolean>('S3_FORCE_PATH_STYLE'),
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}