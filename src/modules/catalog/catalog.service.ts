import { Inject, Injectable } from '@nestjs/common';
import { PaginationDto } from '@common/dto';
import schema from '@/common/database/schemas';
import { and, count, desc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/common/database/db.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { productImagesSchema } from '@modules/product-images/entities/product-images.entity';
import { CategoryService } from '@modules/category/category.service';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly categoryService: CategoryService,
  ) {}

  async findAll(pagination: PaginationDto) {
    const { limit = 10, offset = 0 } = pagination;

    // 🔹 Productos + mainImage (order = 0)
    const products = await this.database
      .select({
        id: schema.products.id,
        slug: schema.products.slug,
        title: schema.products.title,
        price: schema.products.price,
        stock: schema.products.stock,
        active: schema.products.active,
        createdAt: schema.products.createdAt,

        mainImage: schema.productImages.url,
      })
      .from(schema.products)
      .leftJoin(
        schema.productImages,
        and(
          eq(schema.productImages.productId, schema.products.id),
          eq(schema.productImages.order, 0),
        ),
      )
      .where(eq(schema.products.active, true))
      .orderBy(desc(schema.products.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ total }] = await this.database
      .select({ total: count() })
      .from(schema.products)
      .where(eq(schema.products.active, true))
      .execute();

    return {
      items: products.map((p) => ({
        ...p,
        mainImage: p.mainImage ?? null,
      })),
      total: Number(total),
      limit,
      offset,
    };
  }

  async findAllByCategory(categoryId: number, pagination: PaginationDto) {
    const { limit = 10, offset = 0 } = pagination;

    // Validar categoría existe y es hoja (opcional para catálogo público)
    const category = await this.categoryService.categoryExists(categoryId);
    this.categoryService.categoryIsLeaf(category);

    const items = await this.database
      .select({
        id: schema.products.id,
        slug: schema.products.slug,
        title: schema.products.title,
        description: schema.products.description,
        location: schema.products.location,
        price: schema.products.price,
        stock: schema.products.stock,
        active: schema.products.active,
        categoryId: schema.products.categoryId,
        createdAt: schema.products.createdAt,
        updatedAt: schema.products.updatedAt,

        mainImage: productImagesSchema.url,
      })
      .from(schema.products)
      .leftJoin(
        productImagesSchema,
        and(
          eq(productImagesSchema.productId, schema.products.id),
          eq(productImagesSchema.order, 0),
        ),
      )
      .where(
        and(
          eq(schema.products.categoryId, categoryId),
          eq(schema.products.active, true), // Solo activos para catálogo público
        ),
      )
      .orderBy(desc(schema.products.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ total }] = await this.database
      .select({ total: count() })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.categoryId, categoryId),
          eq(schema.products.active, true),
        ),
      )
      .execute();

    return {
      items,
      total: Number(total),
      limit,
      offset,
    };
  }
}
