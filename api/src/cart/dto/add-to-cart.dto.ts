// Phase 4

import { IsInt, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Shape + validation rules for the body of POST /api/cart/items.
// No cartId here on purpose - which cart this goes into is resolved
// server-side (the caller's own active cart, created if they don't have
// one yet), never something the client names directly. Same reasoning as
// createdBy on CreateProductDto never coming from the request body.
export class AddToCartDto {
  @ApiProperty({ description: 'Which product to add' })
  @IsUUID()
  productId!: string;

  // The "must be at least 1" rule is deliberately NOT a Min(1) decorator
  // here - that would auto-generate a message with no product name in it
  // ("quantity must not be less than 1"), useless when a cart has several
  // items. CartService.addItem() checks this itself instead, once the
  // product is already loaded, so the message can actually say which one.
  @ApiProperty({ description: 'How many to add (merges with existing quantity if already in cart)', minimum: 1 })
  @IsInt()
  @Type(() => Number)
  quantity!: number;
}
