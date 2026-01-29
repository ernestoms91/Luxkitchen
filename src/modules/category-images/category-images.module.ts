import { Module } from '@nestjs/common';
import { CategoryImagesService } from './category-images.service';
import { CategoryImagesController } from './category-images.controller';
import { DatabaseModule } from '@common/database/db.module';
import { StorageModule } from '@modules/storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [CategoryImagesController],
  providers: [CategoryImagesService],
})
export class CategoryImagesModule {}
