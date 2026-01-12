import { PartialType } from '@nestjs/mapped-types';
import { AddToCartDto } from './add-toCart.dto';

export class UpdateCartDto extends PartialType(AddToCartDto) {}
