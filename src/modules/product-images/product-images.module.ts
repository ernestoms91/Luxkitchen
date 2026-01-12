import { Module } from '@nestjs/common';
import { ProductImagesService } from '@modules/product-images/product-images.service';
import { ProductImagesController } from '@modules/product-images/product-images.controller';
import { DatabaseModule } from '@/common/database/db.module';
import { StorageModule } from '@modules/storage/storage.module';

@Module({
  controllers: [ProductImagesController],
  providers: [ProductImagesService],
  imports:[DatabaseModule, StorageModule],
  exports: [ProductImagesService],
})
export class ProductImagesModule {}
