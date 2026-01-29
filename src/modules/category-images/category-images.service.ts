import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { categoryImagesSchema } from '@modules/category-images/entities/category-image.entity';
import { CreateCategoryImageDto } from '@modules/category-images/dto/create-category-image.dto';
import { StorageService } from '@modules/storage/storage.service';
import { DATABASE_CONNECTION } from '@/common/database/db.provider';
import schema from '@/common/database/schemas';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CategoryImagesService {
  private logger = new Logger(CategoryImagesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async uploadImage(categoryId: number, file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Invalid file upload');
    }

    // 1️ Validar que la categoría exista
    const category = await this.database.query.categories.findFirst({
      where: eq(schema.categories.id, categoryId),
    });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // 2 Bucket desde config
    const bucketName =
      this.configService.get<string>('STORAGE_BUCKET') ?? 'luxkitchen';

    // 3 Generar key
    const key = `categories/${categoryId}/${Date.now()}-${file.originalname}`;

    // 4 Subir nueva imagen (primero)
    await this.storageService.uploadFile(key, file.buffer, file.mimetype);

    // 5 URL pública
    const publicUrl = `/${bucketName}/${key}`;

    // 6 UPSERT en BD (1 sola operación, atómica)
    const [image] = await this.database
      .insert(categoryImagesSchema)
      .values({
        categoryId,
        url: publicUrl,
      })
      .onConflictDoUpdate({
        target: categoryImagesSchema.categoryId,
        set: {
          url: publicUrl,
          createdAt: new Date(),
        },
      })
      .returning();

    this.logger.log(`Category image upserted: ${categoryId}`);

    return image;
  }

  async remove(id: number) {
    // Buscar imagen
    const image = await this.database.query.categoryImages.findFirst({
      where: eq(categoryImagesSchema.id, id),
    });

    if (!image) {
      throw new NotFoundException('Category image not found');
    }

    // Borrar archivo en storage (si falla, la función lanza y NO continúa)
    await this.storageService.deleteFileByUrl(image.url);

    // Borrar registro en BD
    await this.database
      .delete(categoryImagesSchema)
      .where(eq(categoryImagesSchema.id, id));

    this.logger.log(`Category image ${id} deleted`);
  }
}
