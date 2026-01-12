import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/db.module';
import { CategoryService } from '@modules/category/category.service';
import { CategoryController } from '@modules/category/category.controller';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  imports: [DatabaseModule],
  exports: [CategoryService],
})
export class CategoryModule {}
