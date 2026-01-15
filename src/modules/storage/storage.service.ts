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
    @Inject('S3_CLIENT') // inyectamos el cliente creado en el módulo
    private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('S3_BUCKET_NAME')!;
  }

  // Método para subir archivo a S3/MinIO
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | Blob | string,
    contentType: string,
  ): Promise<string> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );

      this.logger.log(`File uploaded: ${key} to bucket: ${this.bucket}`);
      // Retornamos la URL pública o ruta para acceso (ajusta si tienes dominio o path diferente)
      return `${this.s3.config.endpoint}/${this.bucket}/${key}`;
    } catch (error) {
      this.logger.error(`Error uploading file: ${key}`, error);
      throw error;
    }
  }

  // Método para borrar archivo
  async deleteFile( key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`File deleted: ${key} from bucket: ${this.bucket}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${key}`, error);
      throw error;
    }
  }
}
