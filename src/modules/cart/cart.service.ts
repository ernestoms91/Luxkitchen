import { DATABASE_CONNECTION } from '@/common/database/db.provider';
import schema from '@/common/database/schemas';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cartItemsSchema, cartsSchema } from '@modules/cart/entities';
import { AddToCartDto } from '@modules/cart/dto';
import { and, eq, InferSelectModel } from 'drizzle-orm';
import { productsSchema } from '@modules/product/entities';
import { ProductService } from '../product/product.service';

type Product = InferSelectModel<typeof schema.products>;
type CartItem = InferSelectModel<typeof schema.cartItems>;
type Cart = InferSelectModel<typeof schema.carts>;

type ProductType = {
  id: string;
  title: string;
  price: string;
  stock: number;
  active: boolean;
};

type CartItemWithProduct = {
  cartItemId: string;
  quantity: number;
  priceAtTime: number;
  product: {
    id: string;
    name: string;
    currentPrice: number;
    stock: number;
    available: boolean;
  };
};

type AdjustmentMessage = {
  productId: string;
  message: string;
};

@Injectable()
export class CartService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly productService: ProductService,
  ) {}

  private async updateCartTimestamp(cartId: string) {
    await this.database
      .update(cartsSchema)
      .set({ updatedAt: new Date() })
      .where(eq(cartsSchema.id, cartId));
  }

  async addToCart(userId: number, dto: AddToCartDto) {
    this.validateQuantity(dto.quantity);

    const cart = await this.getOrCreateCart(userId);
    const product = await this.productService.validateProduct(dto.productId);

    // Ajustar cantidad si excede stock disponible
    let quantityToAdd = dto.quantity;
    if (quantityToAdd > product.stock) {
      quantityToAdd = product.stock;
    }

    // Rechazar si el stock es insuficiente después de ajustar
    if (quantityToAdd <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    return await this.updateOrAddItem(cart.id, product, quantityToAdd);
  }

  private async getOrCreateCart(userId: number) {
    let cart = await this.database
      .select()
      .from(cartsSchema)
      .where(
        and(eq(cartsSchema.userId, userId), eq(cartsSchema.status, 'active')),
      )
      .limit(1);

    if (!cart.length) {
      const [newCart] = await this.database
        .insert(cartsSchema)
        .values({ userId, status: 'active' })
        .returning();
      cart = [newCart];
    }

    return cart[0];
  }

  private async updateOrAddItem(
    cartId: string,
    product: Product,
    quantity: number,
  ) {
    const existingItem = await this.database
      .select()
      .from(cartItemsSchema)
      .where(
        and(
          eq(cartItemsSchema.cartId, cartId),
          eq(cartItemsSchema.productId, product.id),
        ),
      )
      .limit(1);

    let newQuantity = quantity;
    if (existingItem.length) {
      newQuantity += existingItem[0].quantity;
    }

    // Ajustar cantidad si excede el stock disponible
    if (newQuantity > product.stock) {
      newQuantity = product.stock;
    }

    if (existingItem.length) {
      await this.database
        .update(cartItemsSchema)
        .set({ quantity: newQuantity, updatedAt: new Date() })
        .where(eq(cartItemsSchema.id, existingItem[0].id));

      await this.updateCartTimestamp(cartId);

      return {
        ...existingItem[0],
        quantity: newQuantity,
      };
    } else {
      const [newItem] = await this.database
        .insert(cartItemsSchema)
        .values({
          cartId,
          productId: product.id,
          quantity: newQuantity,
          priceAtTime: product.price,
        })
        .returning();

      await this.updateCartTimestamp(cartId);
      return newItem;
    }
  }

  async getCart(userId: number) {
    // Obtener el carrito activo del usuario
    const cart = await this.getActiveCart(userId);

    // Obtener los ítems del carrito
    const items = await this.getCartItems(cart.id);

    // Validar los ítems del carrito y calcular el total
    const { validItems, adjustmentMessages, total } =
      await this.validateCartItems(items, cart.id);

    // Construir y retornar la respuesta del carrito
    return this.buildCartResponse(cart, validItems, adjustmentMessages, total);
  }

  private async getActiveCart(userId: number) {
    const carts = await this.database
      .select()
      .from(cartsSchema)
      .where(
        and(eq(cartsSchema.userId, userId), eq(cartsSchema.status, 'active')),
      )
      .limit(1);

    if (!carts.length) {
      throw new NotFoundException('No active cart found');
    }

    return carts[0];
  }

  private async getCartItems(cartId: string) {
    return this.database
      .select()
      .from(cartItemsSchema)
      .where(eq(cartItemsSchema.cartId, cartId));
  }

  private async validateCartItems(items: CartItem[], cartId: string) {
    if (items.length === 0) {
      return {
        validItems: [],
        adjustmentMessages: [],
        total: 0,
      };
    }

    const productIds = items.map((i) => i.productId);
    const products = await this.productService.getProductsForItems(productIds);

    const { validItems, adjustmentMessages, total, itemsRemoved } =
      await this.processCartItems(items, products, cartId);

    if (itemsRemoved) {
      await this.updateCartTimestamp(cartId);
    }

    return { validItems, adjustmentMessages, total };
  }

  private async processCartItems(
    items: CartItem[],
    productMap: Map<string, ProductType>,
    cartId: string,
  ) {
    const validItems: CartItemWithProduct[] = [];
    const adjustmentMessages: AdjustmentMessage[] = [];
    let total = 0;
    let itemsRemoved = false;

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product || !this.isProductAvailable(product)) {
        // Eliminar el item no disponible de la BD
        try {
          await this.database
            .delete(cartItemsSchema)
            .where(eq(cartItemsSchema.id, item.id));
          itemsRemoved = true;
          adjustmentMessages.push(this.buildUnavailableMessage(item, product));
        } catch (error) {
          console.error(`Failed to remove unavailable item ${item.id}:`, error);
        }
        continue;
      }

      const { adjustedQuantity, message } = this.adjustQuantity(item, product);
      if (message) adjustmentMessages.push(message);

      // Si la cantidad fue ajustada, actualizar en la base de datos
      if (adjustedQuantity !== item.quantity) {
        try {
          await this.database
            .update(cartItemsSchema)
            .set({ quantity: adjustedQuantity })
            .where(eq(cartItemsSchema.id, item.id));
        } catch (error) {
          // Si falla la actualización, registrar pero continuar con los otros items
          console.error(`Failed to update item quantity for ${item.id}:`, error);
        }
      }

      const itemTotal = this.calculateItemTotal(
        product.price,
        adjustedQuantity,
      );
      total += itemTotal;

      validItems.push(
        this.buildValidItem(item, product, adjustedQuantity, itemTotal),
      );
    }
    return { validItems, adjustmentMessages, total, itemsRemoved };
  }

  private isProductAvailable(product: ProductType): boolean {
    return product.active && product.stock > 0;
  }

  private buildUnavailableMessage(
    item: CartItem,
    product: ProductType | undefined,
  ): AdjustmentMessage {
    return {
      productId: item.productId,
      message: `Product \"${product?.title ?? 'Unknown'}\" is no longer available and was removed from your cart.`,
    };
  }

  private adjustQuantity(item: CartItem, product: ProductType) {
    let adjustedQuantity = item.quantity;
    let message: AdjustmentMessage | null = null;

    if (adjustedQuantity > product.stock) {
      message = {
        productId: item.productId,
        message: `Quantity of \"${product.title}\" was adjusted to ${product.stock} due to limited stock.`,
      };
      adjustedQuantity = product.stock;
    }

    return { adjustedQuantity, message };
  }

  private calculateItemTotal(price: string, quantity: number): number {
    return parseFloat(price) * quantity;
  }

  private buildValidItem(
    item: CartItem,
    product: ProductType,
    quantity: number,
    itemTotal: number,
  ): CartItemWithProduct {
    return {
      cartItemId: item.id,
      quantity,
      priceAtTime: parseFloat(product.price),
      product: {
        id: product.id,
        name: product.title,
        currentPrice: parseFloat(product.price),
        stock: product.stock,
        available: product.active && product.stock > 0,
      },
    };
  }

  private buildCartResponse(
    cart: Cart,
    validItems: CartItemWithProduct[],
    adjustmentMessages: AdjustmentMessage[],
    total: number,
  ) {
    return {
      id: cart.id,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: validItems,
      total: parseFloat(total.toFixed(2)),
      adjustmentMessages,
    };
  }

  async updateItemQuantity(
    userId: number,
    productId: string,
    quantity: number,
  ) {
    this.validateQuantity(quantity);

    const cartItem = await this.getCartItem(userId, productId);
    const product = await this.validateProductAvailability(productId);

    // Ajustar cantidad si excede el stock disponible
    let finalQuantity = quantity;
    if (finalQuantity > product.stock) {
      finalQuantity = product.stock;
    }

    // Rechazar si el stock es insuficiente después de ajustar
    if (finalQuantity <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    const updatedItem = await this.database
      .update(cartItemsSchema)
      .set({ quantity: finalQuantity, updatedAt: new Date() })
      .where(
        and(
          eq(cartItemsSchema.cartId, cartItem.cartId),
          eq(cartItemsSchema.productId, productId),
        ),
      )
      .returning();

    await this.updateCartTimestamp(cartItem.cartId);
    return updatedItem[0];
  }

  private validateQuantity(quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
  }

  private async getCartItem(userId: number, productId: string) {
    // 1. Carrito activo del usuario
    const [cart] = await this.database
      .select()
      .from(cartsSchema)
      .where(
        and(eq(cartsSchema.userId, userId), eq(cartsSchema.status, 'active')),
      )
      .limit(1);

    if (!cart) {
      throw new NotFoundException('No active cart found');
    }

    // 2. Item identificado por (cart + product)
    const [item] = await this.database
      .select()
      .from(cartItemsSchema)
      .where(
        and(
          eq(cartItemsSchema.cartId, cart.id),
          eq(cartItemsSchema.productId, productId),
        ),
      )
      .limit(1);

    if (!item) {
      throw new NotFoundException('Product not found in cart');
    }

    return item; // ← incluye item.id, cartId, productId, quantity
  }

  private async validateProductAvailability(productId: string) {
    const product = await this.database
      .select()
      .from(productsSchema)
      .where(eq(productsSchema.id, productId))
      .limit(1);

    if (!product.length || !product[0].active) {
      throw new BadRequestException('Product not available');
    }

    return product[0];
  }

  async removeItem(userId: number, productId: string) {
    const cartItem = await this.getCartItem(userId, productId);

    await this.database
      .delete(cartItemsSchema)
      .where(
        and(
          eq(cartItemsSchema.cartId, cartItem.cartId),
          eq(cartItemsSchema.productId, productId),
        ),
      );

    await this.updateCartTimestamp(cartItem.cartId);

    return { message: 'Product removed from cart successfully' };
  }

  async clearCart(userId: number) {
    // 1. Buscar carrito activo del usuario
    const carts = await this.database
      .select()
      .from(cartsSchema)
      .where(
        and(eq(cartsSchema.userId, userId), eq(cartsSchema.status, 'active')),
      )
      .limit(1);

    if (!carts.length) {
      throw new NotFoundException('No active cart found');
    }

    const cart = carts[0];

    // 2. Eliminar todos los items relacionados con ese carrito
    await this.database
      .delete(cartItemsSchema)
      .where(eq(cartItemsSchema.cartId, cart.id));

    // Actualizar el timestamp del carrito
    await this.updateCartTimestamp(cart.id);

    return { message: 'Cart emptied successfully' };
  }
}
