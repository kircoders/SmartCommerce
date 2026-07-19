// Phase 4

import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartEntity } from './entities/cart.entity';

// CUSTOMER only - "employees should not access customer carts through
// these endpoints." Unlike products/inventory, there's no admin/internal
// counterpart controller here at all; a cart is exclusively the shopping
// customer's own data.
//
// Every method here pulls the caller's id via @CurrentUser() and passes it
// straight to CartService - never a cartId or customerId from the request
// body/params, so a customer can never act on anyone's cart but their own.
@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get the caller's active cart (auto-created if none exists)" })
  async getCart(@CurrentUser() user: { id: string }): Promise<{ data: CartEntity }> {
    const data = await this.cartService.getCart(user.id);
    return { data };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the cart (merges quantity if already present)' })
  async addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: CartEntity }> {
    const data = await this.cartService.addItem(user.id, dto);
    return { data };
  }

  @Put('items/:id')
  @ApiOperation({ summary: "Update a cart item's quantity" })
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: CartEntity }> {
    const data = await this.cartService.updateItem(user.id, id, dto);
    return { data };
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove one item from the cart' })
  async removeItem(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: CartEntity }> {
    const data = await this.cartService.removeItem(user.id, id);
    return { data };
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the cart (keeps the cart itself active)' })
  async clearCart(@CurrentUser() user: { id: string }): Promise<{ data: CartEntity }> {
    const data = await this.cartService.clearCart(user.id);
    return { data };
  }
}
