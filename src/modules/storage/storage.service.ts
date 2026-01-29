import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;

  constructor(
    @Inject('S3_CLIENT')
    private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('S3_BUCKET_NAME')!;
  }

  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | Blob | string,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    this.logger.log(`File uploaded: ${key}`);
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    this.logger.log(`File deleted: ${key}`);
  }

  async deleteFileByUrl(url: string): Promise<void> {
    const key = this.extractKeyFromUrl(url);
    await this.deleteFile(key);
  }

  private extractKeyFromUrl(url: string): string {
    const prefix = `/${this.bucket}/`;

    if (!url.startsWith(prefix)) {
      throw new Error('Invalid storage URL');
    }

    return url.replace(prefix, '');
  }
}
