// common/interceptors/product-image.interceptor.ts
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '@/modules/product-images/filters/image-file.filter';

const ALLOWED_TYPES = (
  process.env.PRODUCT_IMAGE_ALLOWED_TYPES ?? ''
)
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

const MAX_FILE_SIZE =
  Number(process.env.PRODUCT_IMAGE_MAX_SIZE) || 5 * 1024 * 1024;

export function ProductImageInterceptor() {
  return FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: imageFileFilter(ALLOWED_TYPES),
  });
}

