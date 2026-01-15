// common/interceptors/product-image.interceptor.ts
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '@/modules/product-images/filters/image-file.filter';
import { ConfigService } from '@nestjs/config';

// export function ProductImageInterceptor() {
//   const ALLOWED_TYPES = (process.env.PRODUCT_IMAGE_ALLOWED_TYPES ?? '')
//     .split(',')
//     .map((t) => t.trim().toLowerCase())
//     .filter(Boolean);

//   const MAX_FILE_SIZE =
//     Number(process.env.PRODUCT_IMAGE_MAX_SIZE) || 5 * 1024 * 1024;

//   return FileInterceptor('file', {
//     limits: { fileSize: MAX_FILE_SIZE },
//     fileFilter: imageFileFilter(ALLOWED_TYPES),
//   });
// }
