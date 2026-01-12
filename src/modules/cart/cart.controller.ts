import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartService } from '@modules/cart/cart.service';
import { Auth, GetUser } from '@modules/auth/decorators';
import { InferSelectModel } from 'drizzle-orm';
import { productsSchema } from '@modules/product/entities';
import { AddToCartDto } from '@modules/cart/dto';
import { usersSchema } from '@modules/auth/entities';

type User = InferSelectModel<typeof usersSchema>;

@Controller('v1/carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Auth()
  @Post('items')
  async addToCart(@GetUser() user: User, @Body() dto: AddToCartDto) {
    const cartItem = await this.cartService.addToCart(user.id, dto);
    return {
      ok: true,
      message: 'Item added to cart successfully',
      data: cartItem,
    };
  }

  @Auth()
  @Get()
  async getCart(@GetUser() user: User) {
    const cartDetails = await this.cartService.getCart(user.id);

    return {
      ok: true,
      message: 'Cart retrieved successfully',
      data: cartDetails,
    };
  }

  @Auth()
  @Put('items')
  async updateItemQuantity(@GetUser() user: User, @Body() dto: AddToCartDto) {
    const updatedItem = await this.cartService.updateItemQuantity(
      user.id,
      dto.productId,
      dto.quantity,
    );

    return {
      ok: true,
      message: 'Cart item updated successfully',
      data: updatedItem,
    };
  }

  @Auth()
  @Delete('items/:productId')
  async deleteItem(
    @GetUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    await this.cartService.removeItem(user.id, productId);

    return {
      ok: true,
      message: 'Cart item deleted successfully',
    };
  }

  @Auth()
  @Delete()
  async clearCart(@GetUser() user: User) {
    await this.cartService.clearCart(user.id);
    return {
      ok: true,
      message: 'Cart emptied successfully',
    };
  }
}
