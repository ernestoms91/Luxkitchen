// src/common/decorators/image-upload.decorator.ts
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ProductImageInterceptor } from '@modules/product-images/interceptors/product-image.interceptor';

export function ImageUpload() {
  return applyDecorators(
    UseInterceptors(ProductImageInterceptor()),           // Tu Multer config
//     ApiConsumes('multipart/form-data'),
//     ApiBody({
//       schema: {
//         type: 'object',
//         properties: {
//           file: { 
//             type: 'string', 
//             format: 'binary' 
//           },
//           productId: { 
//             type: 'string', 
//             description: 'UUID del producto',
//             example: '123e4567-e89b-12d3-a456-426614174000'
//           },
//           fileName: { 
//             type: 'string', 
//             description: 'Nombre del archivo',
//             example: 'imagen-producto.jpg'
//           },
//           contentType: { 
//             type: 'string', 
//             description: 'Tipo MIME',
//             example: 'image/jpeg'
//           },
//           order: { 
//             type: 'number', 
//             description: 'Orden opcional (mínimo 0)',
//             example: 1
//           }
//         },
//         required: ['file', 'productId', 'fileName', 'contentType']
//       }
//     })
  );
}
