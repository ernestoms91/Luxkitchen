import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CatalogService } from '@modules/catalog/catalog.service';
import { PaginationDto } from '@common/dto';
import { SuccessResponseDto } from '@/common/dto';
import { ProductService } from '@modules/product/product.service';
import { ProductImagesService } from '@modules/product-images/product-images.service';
import { CatalogSearchProductsDto } from '@modules/catalog/dto';

@Controller('v1/catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly productService: ProductService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  @Get()
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<SuccessResponseDto> {
    const result = await this.catalogService.findAll(pagination);

    return {
      ok: true,
      message: 'Catalog products retrieved successfully',
      data: result,
    };
  }

  @Get('category/:categoryId')
  async findByCategory(
    @Query() paginationDto: PaginationDto,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<SuccessResponseDto> {
    const result = await this.catalogService.findAllByCategory(
      categoryId,
      paginationDto,
    );

    return {
      ok: true,
      message: 'Products retrieved successfully',
      data: result,
    };
  }

  @Get('search')
  async search(
    @Query() query: CatalogSearchProductsDto,
  ): Promise<SuccessResponseDto> {
    const result = await this.productService.search(query);
    return {
      ok: true,
      message: 'Search results retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponseDto> {
    const product = await this.productService.findOneActive(id);
    const images = await this.productImagesService.findByProduct(id);

    return {
      ok: true,
      message: 'Product retrieved successfully',
      data: { ...product, images },
    };
  }

  @Get('slug/:slug')
  async findOneBySlug(
    @Param('slug') slug: string,
  ): Promise<SuccessResponseDto> {
    const product = await this.productService.findOneActiveBySlug(slug);
    const images = await this.productImagesService.findByProduct(product.id);

    return {
      ok: true,
      message: 'Product retrieved successfully',
      data: { ...product, images },
    };
  }
}
