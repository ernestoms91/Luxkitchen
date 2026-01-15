import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProductImageDto,
  UpdateProductImageOrderDto,
} from '@modules/product-images/dto';
import { DATABASE_CONNECTION } from '@/common/database/db.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ProductService } from '@modules/product/product.service';
import schema from '@/common/database/schemas';
import {
  and,
  count,
  eq,
  gte,
  InferSelectModel,
  lt,
  sql,
  gt,
  lte,
} from 'drizzle-orm';
import { productImagesSchema } from '@modules/product-images/entities/product-images.entity';
import { StorageService } from '@modules/storage/storage.service';
import { ConfigService } from '@nestjs/config';

type ProductImage = InferSelectModel<typeof productImagesSchema>;

@Injectable()
export class ProductImagesService {
  private logger = new Logger(ProductImagesService.name);
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async uploadImage({
    dto,
    file,
  }: {
    dto: CreateProductImageDto;
    file: Express.Multer.File;
  }): Promise<ProductImage> {
    const { productId, order } = dto;

    if (!file?.buffer) {
      throw new BadRequestException('Invalid file upload');
    }

    const maxImages =
      this.configService.get<number>('PRODUCT_IMAGES_MAX_COUNT') ?? 6;

    // Contar imágenes existentes
    const [{ total }] = await this.database
      .select({ total: count() })
      .from(productImagesSchema)
      .where(eq(productImagesSchema.productId, productId));

    const imagesCount = Number(total);

    if (imagesCount >= maxImages) {
      throw new BadRequestException(
        `Maximum number of images (${maxImages}) reached for this product.`,
      );
    }

    // Datos del archivo
    const fileName = file.originalname;
    const contentType = file.mimetype;

    // Bucket desde config (¡GENÉRICO!)
    const bucketName =
      this.configService.get<string>('STORAGE_BUCKET') ?? 'luxkitchen';

    // Subida a storage
    const key = `products/${productId}/${Date.now()}-${fileName}`;

    await this.storageService.uploadFile(key, file.buffer, contentType); // No necesitamos el return

    // ✅ URL construida manualmente (funciona con cualquier bucket)
    const publicUrl = `/${bucketName}/${key}`;

    console.log('PUBLIC URL:', publicUrl);

    return await this.database.transaction(async (tx) => {
      const newOrder = order === undefined ? imagesCount : order;

      if (newOrder < 0 || newOrder > imagesCount) {
        throw new BadRequestException(
          `Order must be between 0 and ${imagesCount}`,
        );
      }

      // Desplazar órdenes
      await tx
        .update(productImagesSchema)
        .set({
          order: sql`${productImagesSchema.order} + 1`,
        })
        .where(
          and(
            eq(productImagesSchema.productId, productId),
            gte(productImagesSchema.order, newOrder),
          ),
        );

      const [image] = await tx
        .insert(productImagesSchema)
        .values({
          productId,
          url: publicUrl, // ← URL limpia y genérica
          order: newOrder,
        })
        .returning();

      return image;
    });
  }

  async findByProduct(productId: string): Promise<ProductImage[]> {
    // 2️ Obtener imágenes ordenadas
    const images = await this.database
      .select({
        id: productImagesSchema.id,
        productId: productImagesSchema.productId,
        url: productImagesSchema.url,
        order: productImagesSchema.order,
        createdAt: productImagesSchema.createdAt,
      })
      .from(productImagesSchema)
      .where(eq(productImagesSchema.productId, productId))
      .orderBy(productImagesSchema.order)
      .execute();

    if (images.length === 0) {
      throw new NotFoundException('Product not found or has no images');
    }

    return images;
  }

  async updateOrder(
    imageId: string,
    dto: UpdateProductImageOrderDto,
  ): Promise<ProductImage> {
    const { order: newOrder } = dto;

    return this.database.transaction(async (tx) => {
      // 1. Obtener la imagen actual
      const [image] = await tx
        .select()
        .from(productImagesSchema)
        .where(eq(productImagesSchema.id, imageId))
        .execute();

      if (!image) {
        throw new NotFoundException(`Image with ID ${imageId} not found`);
      }

      const { productId, order: currentOrder } = image;

      // 2. Contar imágenes del producto
      const [{ total }] = await tx
        .select({ total: count() })
        .from(productImagesSchema)
        .where(eq(productImagesSchema.productId, productId));

      const imagesCount = Number(total);

      // 3. Obtener límite máximo desde configuración
      const maxAllowed =
        this.configService.get<number>('PRODUCT_IMAGES_MAX_COUNT') ?? 6;

      // 4. Calcular el máximo orden permitido, basado en la menor cantidad entre maxAllowed y número actual de imágenes
      const maxOrderByCount = imagesCount > 0 ? imagesCount - 1 : 0;
      const maxOrder = Math.min(maxAllowed - 1, maxOrderByCount);

      // 5. Validar rango del nuevo orden
      if (newOrder < 0 || newOrder > maxOrder) {
        throw new BadRequestException(
          `Order must be between 0 and ${maxOrder}`,
        );
      }

      // 6. Si no cambia, retornamos la misma imagen
      if (newOrder === currentOrder) {
        return image;
      }

      // 7. Reordenar imágenes intermedias
      if (newOrder > currentOrder) {
        // Mover hacia abajo
        await tx
          .update(productImagesSchema)
          .set({
            order: sql`${productImagesSchema.order} - 1`,
          })
          .where(
            and(
              eq(productImagesSchema.productId, productId),
              gt(productImagesSchema.order, currentOrder),
              lte(productImagesSchema.order, newOrder),
            ),
          )
          .execute();
      } else {
        // Mover hacia arriba
        await tx
          .update(productImagesSchema)
          .set({
            order: sql`${productImagesSchema.order} + 1`,
          })
          .where(
            and(
              eq(productImagesSchema.productId, productId),
              gte(productImagesSchema.order, newOrder),
              lt(productImagesSchema.order, currentOrder),
            ),
          )
          .execute();
      }

      // 8. Actualizar la imagen con el nuevo orden
      const [updated] = await tx
        .update(productImagesSchema)
        .set({ order: newOrder })
        .where(eq(productImagesSchema.id, imageId))
        .returning();

      this.logger.log(
        `Image ${imageId} order changed from ${currentOrder} to ${newOrder}`,
      );

      return updated;
    });
  }

  async deleteImage(imageId: string): Promise<void> {
    return this.database.transaction(async (tx) => {
      // 1. Obtener imagen para validar existencia y obtener URL y productId
      const [image] = await tx
        .select()
        .from(productImagesSchema)
        .where(eq(productImagesSchema.id, imageId))
        .execute();

      if (!image) {
        throw new NotFoundException(`Image with ID ${imageId} not found`);
      }

      // 2. Extraer key del archivo para borrar en storage (asumiendo URL con formato endpoint/bucket/key)
      const bucketName = this.configService.get<string>('S3_BUCKET_NAME');
      const key = image.url.replace(
        new RegExp(`^https?://[^/]+/${bucketName}/`),
        '',
      );

      // 3. Borrar archivo en storage (S3/MinIO)
      await this.storageService.deleteFile(key);

      // 4. Borrar registro de la imagen en la base de datos
      await tx
        .delete(productImagesSchema)
        .where(eq(productImagesSchema.id, imageId))
        .execute();

      // 5. Reordenar las órdenes de otras imágenes si fuera necesario
      await tx
        .update(productImagesSchema)
        .set({
          order: sql`${productImagesSchema.order} - 1`,
        })
        .where(
          and(
            eq(productImagesSchema.productId, image.productId),
            gt(productImagesSchema.order, image.order),
          ),
        )
        .execute();
    });
  }
}
