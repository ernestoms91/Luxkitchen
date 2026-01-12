import { Module } from '@nestjs/common';
import { CartService } from '@modules/cart/cart.service';
import { CartController } from '@modules/cart/cart.controller';
import { DatabaseModule } from '@/common/database/db.module';
import { ProductModule } from '@modules/product/product.module';

@Module({
  imports: [DatabaseModule, ProductModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartsModule {}
