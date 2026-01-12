import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProductDto,
  UpdateProductDto,
  SearchProductsDto,
} from '@modules/product/dto/';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { usersSchema } from '@modules/auth/entities/';
import {
  count,
  desc,
  eq,
  InferSelectModel,
  inArray,
  and,
  ilike,
  or,
} from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/common/database/db.provider';
import { CategoryService } from '@/modules/category/category.service';
import schema from '@/common/database/schemas';
import { productImagesSchema } from '@/modules/product-images/entities/product-images.entity';
import { PaginationDto } from '@/common/dto';

type User = InferSelectModel<typeof usersSchema>;
type Product = InferSelectModel<typeof schema.products>;

@Injectable()
export class ProductService {
  private logger = new Logger(ProductService.name);
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly categoryService: CategoryService,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    //  Validar categoría (existencia + regla de negocio)
    const category = await this.categoryService.categoryExists(
      createProductDto.categoryId,
    );
    this.categoryService.categoryIsLeaf(category);

    const baseSlug = this.generateSlug(createProductDto.title);
    let slug = baseSlug;
    let suffix = 1;

    // Verificar unicidad del slug con sufijos
    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const [product] = await this.database
      .insert(schema.products)
      .values({
        slug,
        title: createProductDto.title,
        description: createProductDto.description,
        location: user.location,
        price: createProductDto.price.toString(),
        stock: createProductDto.stock,
        active: createProductDto.active,
        categoryId: createProductDto.categoryId,
      })
      .returning();
    this.logger.log(`Product created: ${product.id} by user ${user.id}`);
    return product;
  }

  async findAll(pagination: PaginationDto) {
    const { limit = 10, offset = 0 } = pagination;

    const products = await this.database
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

        // 👇 main image (puede ser null)
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
      .orderBy(desc(schema.products.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ count: total }] = await this.database
      .select({ count: count() })
      .from(schema.products)
      .execute();

    return {
      products,
      total: Number(total),
      limit,
      offset,
    };
  }

  async findAllByCategory(categoryId: number, pagination: PaginationDto) {
    const { limit = 10, offset = 0 } = pagination;

    const category = await this.categoryService.categoryExists(categoryId);
    this.categoryService.categoryIsLeaf(category);

    const items = await this.database
      .select({
        id: schema.products.id,
        slug: schema.products.slug,
        title: schema.products.title,
        price: schema.products.price,
        stock: schema.products.stock,
        active: schema.products.active,
        createdAt: schema.products.createdAt,

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
      .where(eq(schema.products.categoryId, categoryId))
      .orderBy(desc(schema.products.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ total }] = await this.database
      .select({ total: count() })
      .from(schema.products)
      .where(eq(schema.products.categoryId, categoryId))
      .execute();

    return {
      items,
      total: Number(total),
      limit,
      offset,
    };
  }

  async findOne(id: string) {
    const [product] = await this.database
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1)
      .execute();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findOneActive(id: string) {
    const [product] = await this.database
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, id), eq(schema.products.active, true)))
      .limit(1)
      .execute();

    if (!product) {
      throw new NotFoundException('Product not available');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.database
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .then((r) => r[0]);

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Validar category solo si viene
    if (dto.categoryId !== undefined) {
      const category = await this.categoryService.categoryExists(
        dto.categoryId,
      );
      this.categoryService.categoryIsLeaf(category);
    }

    // Validar slug solo si viene
    if (dto.slug !== undefined && dto.slug !== product.slug) {
      const exists = await this.slugExists(dto.slug);
      if (exists) {
        throw new BadRequestException('Slug already exists');
      }
    }

    // 🔹 Construcción explícita (CLARA)
    const data: Partial<typeof schema.products.$inferInsert> = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.price !== undefined) data.price = String(dto.price);
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

    data.updatedAt = new Date();

    const [updated] = await this.database
      .update(schema.products)
      .set(data)
      .where(eq(schema.products.id, id))
      .returning();

    this.logger.log(`Product ${id} updated`);

    return updated;
  }

  async remove(id: string): Promise<void> {
    const product = await this.database
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1)
      .then((res) => res[0]);

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    await this.database
      .delete(schema.products)
      .where(eq(schema.products.id, id))
      .execute();
  }

  async reassignProductsFromCategory(
    oldCategoryId: number,
    newCategoryId: number,
  ): Promise<number> {
    // Evitar re-asignación a la misma categoría
    if (oldCategoryId === newCategoryId) {
      throw new BadRequestException('Old and new category IDs are the same');
    }

    const oldCategory =
      await this.categoryService.categoryExists(oldCategoryId);
    const newCategory =
      await this.categoryService.categoryExists(newCategoryId);

    this.categoryService.categoryIsLeaf(oldCategory);
    this.categoryService.categoryIsLeaf(newCategory);

    const now = new Date();
    // Actualizar todos los productos de la categoría origen
    const updated = await this.database
      .update(schema.products)
      .set({ categoryId: Number(newCategoryId), updatedAt: now })
      .where(eq(schema.products.categoryId, Number(oldCategoryId)))
      .returning({ id: schema.products.id });

    const updatedCount = updated.length;

    // 🔹 Log de evento de negocio
    this.logger.log('Products reassigned between categories', {
      fromCategoryId: oldCategoryId,
      toCategoryId: newCategoryId,
      updatedCount,
    });

    // 🔹 Caso anómalo pero válido
    if (updatedCount === 0) {
      this.logger.warn('Reassign executed but no products were updated', {
        fromCategoryId: oldCategoryId,
        toCategoryId: newCategoryId,
      });
    }

    return updatedCount;
  }

  async getProductsForItems(
    productIds: string[],
  ): Promise<Map<string, Product>> {
    // Consultar los productos en la base de datos
    const products = await this.database
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, productIds));

    // Crear un mapa de productos para un acceso rápido
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    return productMap;
  }

  async search(dto: SearchProductsDto) {
    const { q = '', limit = 10, offset = 0 } = dto;

    const MAX_LIMIT = 100;
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const safeOffset = Math.max(offset, 0);

    const whereCondition = this.buildProductsSearchWhere(q);

    const products = await this.database
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
      .where(whereCondition)
      .orderBy(desc(schema.products.createdAt))
      .limit(safeLimit)
      .offset(safeOffset)
      .execute();

    const [{ count: total }] = await this.database
      .select({ count: count() })
      .from(schema.products)
      .where(whereCondition)
      .execute();

    return {
      products,
      total: Number(total),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  private buildProductsSearchWhere(q: string) {
    const baseCondition = eq(schema.products.active, true);

    const hasQuery = q.trim().length > 0;

    if (!hasQuery) {
      return baseCondition;
    }

    return and(
      baseCondition,
      or(
        ilike(schema.products.title, `%${q}%`),
        ilike(schema.products.description, `%${q}%`),
      ),
    );
  }

  async adminSearch(dto: SearchProductsDto) {
    const { q = '', limit = 10, offset = 0 } = dto;

    const MAX_LIMIT = 100;
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const safeOffset = Math.max(offset, 0);

    const whereCondition = this.buildProductsAdminSearchWhere(q);

    const products = await this.database
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
      .where(whereCondition)
      .orderBy(desc(schema.products.createdAt))
      .limit(safeLimit)
      .offset(safeOffset)
      .execute();

    const [{ count: total }] = await this.database
      .select({ count: count() })
      .from(schema.products)
      .where(whereCondition)
      .execute();

    return {
      products,
      total: Number(total),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  private buildProductsAdminSearchWhere(q: string) {
    // Admin NO filtra por active, busca en TODOS los productos
    const hasQuery = q.trim().length > 0;

    if (!hasQuery) {
      // Sin q, devuelve TODOS los productos (activos e inactivos)
      return undefined; // o sql`true` si tu DB lo requiere
    }

    return or(
      ilike(schema.products.title, `%${q}%`),
      ilike(schema.products.description, `%${q}%`),
    );
  }

  async findOneActiveBySlug(slug: string) {
    const product = await this.database
      .select()
      .from(schema.products)
      .where(
        and(eq(schema.products.slug, slug), eq(schema.products.active, true)),
      )
      .limit(1)
      .execute();

    if (!product.length) {
      throw new NotFoundException('Product not available');
    }

    return product[0];
  }

  async validateProduct(productId: string): Promise<Product> {
    const product = await this.database
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId))
      .limit(1);

    if (!product.length || !product[0].active) {
      throw new BadRequestException('Product not available');
    }

    return product[0];
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async slugExists(slug: string): Promise<boolean> {
    const existing = await this.database
      .select({ id: schema.products.id }) // solo pedimos lo necesario
      .from(schema.products)
      .where(eq(schema.products.slug, slug))
      .limit(1);
    return existing.length > 0;
  }
}
