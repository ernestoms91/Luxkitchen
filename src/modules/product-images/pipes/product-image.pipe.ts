import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductImagePipe implements PipeTransform {
  constructor(private readonly configService: ConfigService) {}

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const maxSize =
      this.configService.get<number>('PRODUCT_IMAGE_MAX_SIZE') ??
      5 * 1024 * 1024;

    // Obtiene los tipos y los convierte automáticamente a regex válido
    const types =
      this.configService.get<string>('PRODUCT_IMAGE_ALLOWED_TYPES') ??
      'image/webp';
    const regex = this.buildRegex(types);

    console.log('Validating:', {
      mimetype: file.mimetype,
      size: file.size,
      regex: regex.source,
    });

    if (file.size > maxSize) {
      throw new BadRequestException(
        `Image too large. Max size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
      );
    }

    if (!regex.test(file.mimetype)) {
      throw new BadRequestException(`Invalid image type. Allowed: ${types}`);
    }

    return file;
  }

  private buildRegex(types: string): RegExp {
    // Si es un solo tipo, escapa caracteres especiales y añade ^$
    if (types.includes(',') === false) {
      const escaped = types.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^${escaped}$`);
    }

    // Si hay múltiples tipos separados por coma, crea alternancia
    const typesArray = types.split(',').map((t) => t.trim());
    const alternations = typesArray
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    return new RegExp(`^(?:${alternations})$`);
  }
}
