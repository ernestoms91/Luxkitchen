import { cartItemsSchema, cartsSchema } from '@/modules/cart/entities';
import { categoryImagesSchema } from '@/modules/category-images/entities/category-image.entity';
import { categoriesSchema } from '@/modules/category/entities/category.entity';
import { productImagesSchema } from '@/modules/product-images/entities/product-images.entity';
import { productsSchema } from '@/modules/product/entities';
import { activationTokenSchema, usersSchema } from '@modules/auth/entities';
const schema = {
  activationToken: activationTokenSchema,
  carts: cartsSchema,
  cartItems: cartItemsSchema,
  categories: categoriesSchema,
  categoryImages: categoryImagesSchema,
  users: usersSchema,
  products: productsSchema,
  productImages: productImagesSchema,
};

export default schema;
