// Phase 4

import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Shape + validation rules for the body of PUT /api/cart/items/:id.
// Just the new quantity - which item and which product are already fixed
// by the :id in the URL, nothing else about a cart item is editable
// (changing the product would just be removing one item and adding
// another, not "updating" this one).
export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}
