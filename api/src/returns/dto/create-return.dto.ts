// Phase 8

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnItemDto {
  @ApiProperty({
    description: "The order item being returned (an id from the order's items)",
  })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ description: 'How many to return', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Condition of the item, e.g. "cracked handle"',
  })
  @IsString()
  @IsOptional()
  conditionNotes?: string;
}

// Shape + validation rules for the body of POST /api/returns. customerId
// comes from @CurrentUser() server-side, same as support tickets. Evidence
// photos are uploaded separately afterwards (POST /api/returns/:id/evidence)
// because a JSON body can't carry files.
export class CreateReturnDto {
  @ApiProperty({ description: 'The delivered order to return items from' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ description: 'Why the customer is returning the items' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ type: [CreateReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items!: CreateReturnItemDto[];
}
