import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ProductImagesService } from '@modules/product-images/product-images.service';
import { Auth } from '@modules/auth/decorators';
import { SuccessResponseDto } from '@/common/dto';
import { productImagesSchema } from '@modules/product-images/entities/product-images.entity';
import { InferSelectModel } from 'drizzle-orm';
import {
  CreateProductImageDto,
  ProductImageResponseDto,
  UpdateProductImageOrderDto,
} from '@modules/product-images/dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductImagePipe } from './pipes/product-image.pipe';

type ProductImage = InferSelectModel<typeof productImagesSchema>;

@Controller('v1/product-images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post()
  @Auth()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(ProductImagePipe) file: Express.Multer.File,
    @Body() dto: CreateProductImageDto,
  ): Promise<SuccessResponseDto<ProductImageResponseDto>> {

    const image = await this.productImagesService.uploadImage({
      dto,
      file,
    });

    return {
      ok: true,
      message: 'Image uploaded successfully',
      data: image,
    };
  }

  @Get('product/:productId')
  async findByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<SuccessResponseDto<ProductImageResponseDto[]>> {
    const images = await this.productImagesService.findByProduct(productId);

    return {
      ok: true,
      message: 'Product images retrieved successfully',
      data: images,
    };
  }

  @Put('update/:id')
  @Auth()
  async updateOrder(
    @Param('id', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateProductImageOrderDto,
  ): Promise<SuccessResponseDto> {
    const image = await this.productImagesService.updateOrder(imageId, dto);

    return {
      ok: true,
      message: 'Product image order updated successfully',
      data: image,
    };
  }

  @Delete('delete/:id')
  @Auth()
  async delete(
    @Param('id', ParseUUIDPipe) imageId: string,
  ): Promise<SuccessResponseDto> {
    await this.productImagesService.deleteImage(imageId);

    return {
      ok: true,
      message: 'Product image deleted successfully',
    };
  }
}
