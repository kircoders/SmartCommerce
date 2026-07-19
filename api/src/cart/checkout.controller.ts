// Phase 4

import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CartService, CheckoutValidationResult } from './cart.service';
import { CartEntity } from './entities/cart.entity';

// Same access rule as cart.controller.ts - CUSTOMER only. Deliberately
// thin: checkout in this phase is a read-only confirmation screen, no
// order/payment/shipment gets created here (that's Phase 5). Both routes
// just delegate to CartService methods that already exist - GET /checkout
// reuses the same cart data as GET /cart (the frontend computes subtotal/
// total from quantity * unitPrice per item, no separate calculation
// needed here), and POST /checkout/validate re-checks stock without
// modifying anything.
@ApiTags('checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'View the checkout summary (read-only, same data as GET /cart)' })
  async getCheckout(@CurrentUser() user: { id: string }): Promise<{ data: CartEntity }> {
    const data = await this.cartService.getCart(user.id);
    return { data };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Re-check every cart item against current stock (does not modify anything)' })
  async validateCheckout(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: CheckoutValidationResult }> {
    const data = await this.cartService.validateCheckout(user.id);
    return { data };
  }
}
