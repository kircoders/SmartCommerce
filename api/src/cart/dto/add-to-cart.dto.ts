// Phase 4

import { IsInt, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Shape + validation rules for the body of POST /api/cart/items.
// No cartId here on purpose - which cart this goes into is resolved
// server-side (the caller's own active cart, created if they don't have
// one yet), never something the client names directly. Same reasoning as
// createdBy on CreateProductDto never coming from the request body.
export class AddToCartDto {
  @IsUUID()
  productId!: string;

  // Min(1), not Min(0) like inventory's DTOs - a cart item quantity of 0
  // doesn't mean anything; removing the item is a separate endpoint
  // (DELETE /api/cart/items/:id).
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}
