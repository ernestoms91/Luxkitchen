import { Module } from '@nestjs/common';
import { ProductService } from '@modules/product/product.service';
import { ProductController } from '@modules/product/product.controller';
import { DatabaseModule } from '@common/database/db.module';
import { CategoryModule } from '@modules/category/category.module';
import { ProductImagesModule } from '@modules/product-images/product-images.module';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  imports: [DatabaseModule, CategoryModule, ProductImagesModule],
  exports: [ProductService],
})
export class ProductModule {}
