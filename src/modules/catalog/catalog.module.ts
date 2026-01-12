import { Module } from '@nestjs/common';
import { CatalogService } from '@modules/catalog/catalog.service';
import { CatalogController } from '@modules/catalog/catalog.controller';
import { DatabaseModule } from '@/common/database/db.module';
import { ProductImagesModule } from '@modules/product-images/product-images.module';
import { CategoryModule } from '@modules/category/category.module';
import { ProductModule } from '@modules/product/product.module';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  imports: [DatabaseModule, CategoryModule, ProductModule, ProductImagesModule],
})
export class CatalogModule {}
