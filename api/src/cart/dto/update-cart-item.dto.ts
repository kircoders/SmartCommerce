// Phase 4

import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Shape + validation rules for the body of PUT /api/cart/items/:id.
// Just the new quantity - which item and which product are already fixed
// by the :id in the URL, nothing else about a cart item is editable
// (changing the product would just be removing one item and adding
// another, not "updating" this one).
//
// No Min(1) here - that auto-generates a message with no product name
// ("quantity must not be less than 1"), not useful with several items in
// a cart. CartService.updateItem() checks this itself, with the item's
// product already loaded, so the message can name it directly.
export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity for this cart item', minimum: 1 })
  @IsInt()
  @Type(() => Number)
  quantity!: number;
}
