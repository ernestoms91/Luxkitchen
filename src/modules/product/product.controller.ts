import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductService } from '@modules/product/product.service';
import { Auth, GetUser } from '@modules/auth/decorators';
import { usersSchema } from '@modules/auth/entities/user.entity';
import { InferSelectModel } from 'drizzle-orm';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { CreateProductDto, SearchProductsDto, UpdateProductDto } from '@/modules/product/dto';
import { productsSchema } from '@modules/product/entities';
import { ValidRoles } from '@modules/auth/interfaces';
import { ProductImagesService } from '@modules/product-images/product-images.service';
import { PaginationDto } from '@/common/dto';

type User = InferSelectModel<typeof usersSchema>;
type Product = InferSelectModel<typeof productsSchema>;

@Controller('v1/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  @Post()
  @Auth(ValidRoles.ADMIN)
  async create(
    @Body() createProductDto: CreateProductDto,
    @GetUser() user: User,
  ): Promise<SuccessResponseDto<Product>> {
    const product = await this.productService.create(createProductDto, user);
    return {
      ok: true,
      message: 'Product created successfully',
      data: product,
    };
  }

  @Get()
  @Auth()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<SuccessResponseDto> {
    const products = await this.productService.findAll(paginationDto);
    return {
      ok: true,
      message: 'Products retrieved successfully',
      data: products,
    };
  }

  @Get('category/:categoryId')
  @Auth()
  async byCategory(
    @Query() paginationDto: PaginationDto,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<SuccessResponseDto> {
    const result = await this.productService.findAllByCategory(
      categoryId,
      paginationDto,
    );
    return {
      ok: true,
      message: 'Products retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string): Promise<SuccessResponseDto> {
    const product = await this.productService.findOne(id);
    const images = await this.productImagesService.findByProduct(id);
    return {
      ok: true,
      message: 'Product retrieved successfully',
      data: { ...product, images },
    };
  }

  @Get('search')
  async search(
    @Query() query: SearchProductsDto,
  ): Promise<SuccessResponseDto> {
    const result = await this.productService.adminSearch(query);
    return {
      ok: true,
      message: 'Search results retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @Auth()
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<SuccessResponseDto> {
    const updatedProduct = await this.productService.update(
      id,
      updateProductDto,
    );

    return {
      ok: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    };
  }

  @Patch('reassign-category/:categoryId')
  @Auth()
  async reassignProducts(
    @Param('categoryId', ParseIntPipe) oldCategoryId: number,
    @Body('newCategoryId', ParseIntPipe) newCategoryId: number,
  ): Promise<SuccessResponseDto<{ updated: number }>> {
    // Llama al servicio para reasignar productos
    const updatedCount = await this.productService.reassignProductsFromCategory(
      oldCategoryId, // ID de la categoría actual
      newCategoryId, // ID de la categoría nueva
    );

    // Respuesta
    return {
      ok: true,
      message: `Updated ${updatedCount} products reassigned successfully from category ${oldCategoryId} to ${newCategoryId}`,
    };
  }

  @Delete(':id')
  @Auth()
  async remove(@Param('id') id: string): Promise<SuccessResponseDto> {
    await this.productService.remove(id);
    return {
      ok: true,
      message: 'Product deleted successfully',
    };
  }
}
