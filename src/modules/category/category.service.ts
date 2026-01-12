import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto, FindCategoryDto } from '@/modules/category/dto/';
import { DATABASE_CONNECTION } from '@/common/database/db.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import schema from '@/common/database/schemas';
import { count, desc, eq, ilike, InferSelectModel, sql } from 'drizzle-orm';
import { categoriesSchema } from '@modules/category/entities/category.entity';

type Category = InferSelectModel<typeof categoriesSchema>;
@Injectable()
export class CategoryService {
  private logger = new Logger(CategoryService.name);
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // 1. Verifica si ya existe una categoría con el mismo nombre para evitar duplicados
    const existing = await this.findByName(createCategoryDto.name);
    if (existing) {
      throw new BadRequestException(
        `Category name "${createCategoryDto.name}" already exists`,
      );
    }

    const now = new Date();
    // 2. Obtiene el parentId, si no viene lo pone en null (categoría raíz)
    const parentId = createCategoryDto.parentId ?? null;

    // 3. Ejecuta una transacción para que todas las operaciones sean atómicas
    return await this.database.transaction(async (tx) => {
      // 4. Si hay parentId, valida que exista la categoría padre
      if (parentId !== null) {
        const parent = await tx
          .select()
          .from(schema.categories)
          .where(eq(schema.categories.id, parentId))
          .limit(1)
          .execute()
          .then((r) => r[0]);

        // 5. Si no existe la categoría padre, lanza error
        if (!parent) {
          throw new NotFoundException(
            `Parent category with ID ${parentId} not found`,
          );
        }

        // 6. Si el padre es una hoja (isLeaf=true), actualiza para que ya no lo sea
        if (parent.isLeaf) {
          await tx
            .update(schema.categories)
            .set({ isLeaf: false }) // Ya no es hoja porque tendrá hijos
            .where(eq(schema.categories.id, parentId))
            .execute();
        }
      }

      // 7. Inserta la nueva categoría, que será siempre hoja (isLeaf: true)
      const [newCategory] = (await tx
        .insert(schema.categories)
        .values({
          name: createCategoryDto.name,
          description: createCategoryDto.description,
          parentId, // Puede ser null si es categoría raíz
          createdAt: now,
          isLeaf: true,
        })
        .returning()) as Category[]; // Devuelve la categoría insertada

      // 8. Registra en log que se creó la categoría
      this.logger.log(`Category created: ${newCategory.id}`);

      // 9. Retorna la categoría recién creada
      if (!newCategory) {
        throw new InternalServerErrorException('Failed to create category');
      }
      return newCategory;
    });
  }

  async findAll(pagination: FindCategoryDto) {
    const { limit = 10, offset = 0, parentId, search } = pagination;

    // Construir la consulta base
    const query = this.database
      .select()
      .from(schema.categories)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.categories.createdAt));

    // Agregar filtro por parentId (ver solo subcategorías de una categoría específica)
    if (parentId !== undefined) {
      query.where(eq(schema.categories.parentId, parentId));
    }

    // Agregar búsqueda por nombre si viene el parámetro search
    if (search) {
      query.where(ilike(schema.categories.name, `%${search}%`));
    }

    // Ejecutar la consulta principal
    const categories = await query.execute();

    // Calcular total con mismos filtros (sin paginación)
    const countQuery = this.database
      .select({ count: count() })
      .from(schema.categories);

    if (parentId !== undefined) {
      countQuery.where(eq(schema.categories.parentId, parentId));
    }

    if (search) {
      countQuery.where(ilike(schema.categories.name, `%${search}%`));
    }

    const totalResult = await countQuery.execute();

    return {
      categories,
      total: Number(totalResult[0].count),
      limit,
      offset,
    };
  }

  async findOne(id: number): Promise<Category> {
    const [category] = (await this.database
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        description: schema.categories.description,
        parentId: schema.categories.parentId,
        isLeaf: schema.categories.isLeaf,
        isDeleted: schema.categories.isDeleted,
        createdAt: schema.categories.createdAt,
      })
      .from(schema.categories)
      .where(eq(schema.categories.id, id))
      .execute()) as Category[];

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findByName(name: string) {
    return await this.database
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.name, name))
      .limit(1)
      .then((res) => res[0]);
  }

  async update(category: Category, updateCategoryDto: CreateCategoryDto) {
    const id = category.id;

    // 1. Validar unicidad del nombre
    const existing = await this.findByName(updateCategoryDto.name);
    if (existing && existing.id !== id) {
      throw new BadRequestException(
        `Category name "${updateCategoryDto.name}" already exists`,
      );
    }

    // 2. Validar parentId
    const oldParentId = category.parentId;
    const newParentId = updateCategoryDto.parentId;

    if (newParentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    if (newParentId !== null) {
      const parent = await this.findOne(newParentId);

      if (!parent) {
        throw new BadRequestException(
          `Parent category with ID ${newParentId} not found`,
        );
      }

      const isCircular = await this.isDescendantOf(newParentId, id);
      if (isCircular) {
        throw new BadRequestException(
          'A category cannot be moved under one of its own children',
        );
      }
    }

    // 3. Actualizar categoría
    const updated = await this.database
      .update(schema.categories)
      .set({ ...updateCategoryDto })
      .where(eq(schema.categories.id, id))
      .returning();

    // 4. Ajustar isLeaf de los padres si cambió
    if (oldParentId !== newParentId) {
      if (oldParentId !== null) {
        const remainingChildren = await this.countChildren(oldParentId);
        if (remainingChildren === 0) {
          await this.database
            .update(schema.categories)
            .set({ isLeaf: true })
            .where(eq(schema.categories.id, oldParentId));
        }
      }

      if (newParentId !== null) {
        await this.database
          .update(schema.categories)
          .set({ isLeaf: false })
          .where(eq(schema.categories.id, newParentId));
      }
    }

    // 5. Actualizar isLeaf de la categoría actual
    const childrenCount = await this.countChildren(id);
    await this.database
      .update(schema.categories)
      .set({ isLeaf: childrenCount === 0 })
      .where(eq(schema.categories.id, id));

    return updated[0];
  }

  // Método auxiliar para contar hijos de un padre
  async countChildren(
    parentId: number,
    dbInstance?: NodePgDatabase<typeof schema>,
  ): Promise<number> {
    const db = dbInstance ?? this.database;
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(schema.categories)
      .where(eq(schema.categories.parentId, parentId))
      .execute();

    return Number(total);
  }

  private async isDescendantOf(
    descendantId: number,
    ancestorId: number,
  ): Promise<boolean> {
    let currentId: number | null = descendantId;

    while (currentId !== null) {
      const category = await this.findOne(currentId);
      if (!category) break;

      if (category.parentId === ancestorId) {
        return true; // Encontramos un ancestro directo
      }

      currentId = category.parentId;
    }

    return false;
  }

  async delete(id: number): Promise<Category> {
    return await this.database.transaction(async (tx) => {
      const childrenCount = await this.countChildren(id, tx);
      if (childrenCount > 0) {
        throw new BadRequestException(
          `Cannot delete category with ID ${id} because it has child categories.`,
        );
      }

      const [{ count: productCount }] = await tx
        .select({ count: count() })
        .from(schema.products)
        .where(eq(schema.products.categoryId, id))
        .execute();

      if (productCount > 0) {
        throw new BadRequestException(
          `Cannot delete category with ID ${id} because it is assigned to ${productCount} products.`,
        );
      }

      const [deleted] = await tx
        .delete(schema.categories)
        .where(eq(schema.categories.id, id))
        .returning({
          id: schema.categories.id,
          name: schema.categories.name,
          description: schema.categories.description,
          parentId: schema.categories.parentId,
          isLeaf: schema.categories.isLeaf,
          isDeleted: schema.categories.isDeleted,
          createdAt: schema.categories.createdAt,
        });

      if (!deleted) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      const parentId = deleted.parentId;
      if (parentId !== null) {
        const siblingsCount = await this.countChildren(parentId, tx);
        if (siblingsCount === 0) {
          await tx
            .update(schema.categories)
            .set({ isLeaf: true })
            .where(eq(schema.categories.id, parentId));
        }
      }

      // Log de eliminación para auditoría o depuración
      this.logger.log(`Category deleted: ${deleted.id} - ${deleted.name}`);

      return deleted;
    });
  }

  async updateLeafStatus(categoryId: number): Promise<void> {
    const childrenCount = await this.countChildren(categoryId);

    await this.database
      .update(schema.categories)
      .set({
        isLeaf: childrenCount === 0,
      })
      .where(eq(schema.categories.id, categoryId));
  }

  async findOneIncludeDeleted(id: number) {
    const [category] = await this.database
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, id));

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async categoryExists(categoryId: number) {
    const category = await this.database.query.categories.findFirst({
      where: eq(schema.categories.id, categoryId),
    }) as Category | null;

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return category;
  }

  categoryIsLeaf(category: Category) {
    if (!category.isLeaf) {
      throw new BadRequestException(
        `Category ${category.id} must be a leaf category`,
      );
    }
  }
}
