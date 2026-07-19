// Phase 4

import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity, CartStatus } from './entities/cart.entity';

export interface CheckoutValidationIssue {
  productId: string;
  requested: number;
  available: number;
}

export interface CheckoutValidationResult {
  valid: boolean;
  issues: CheckoutValidationIssue[];
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly itemRepo: Repository<CartItemEntity>,
    // forwardRef because ProductsService now also depends back on
    // CartService (to clean up cart_items before a product is deleted -
    // see removeProductFromCarts below) - a genuine circular dependency
    // between the two modules, which NestJS needs forwardRef() on both
    // sides to resolve.
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  // The core "find or create" pattern the whole module is built around -
  // every other method goes through this rather than assuming a cart
  // already exists. The partial unique index on carts(customer_id) WHERE
  // status = 'ACTIVE' (see the migration) means this can never accidentally
  // create a second active cart for the same customer, even under
  // concurrent requests - the database would reject it.
  async getOrCreateActiveCart(customerId: string): Promise<CartEntity> {
    const existing = await this.cartRepo.findOne({
      where: { customerId, status: CartStatus.ACTIVE },
      relations: { items: { product: { images: true } } },
    });
    if (existing) return existing;

    const cart = this.cartRepo.create({ customerId, status: CartStatus.ACTIVE });
    const saved = await this.cartRepo.save(cart);
    saved.items = [];
    return saved;
  }

  // Ownership check shared by update/remove - a cart item has no
  // customerId of its own (normalization - see cart-item.entity.ts), so
  // confirming it belongs to the caller means loading its parent cart and
  // comparing customerId there. Returns NotFoundException (not Forbidden)
  // on a mismatch deliberately - a customer probing someone else's item id
  // should see "doesn't exist," not "exists, but isn't yours," which would
  // leak that the id is valid at all.
  private async findOwnedItem(customerId: string, itemId: string): Promise<CartItemEntity> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: { cart: true },
    });
    if (!item || item.cart.customerId !== customerId) {
      throw new NotFoundException('Cart item not found');
    }
    return item;
  }

  // Throws if adding `requestedTotal` units of a product would exceed
  // what's currently available. Takes the TOTAL desired quantity, not the
  // delta being added - if 3 are already in the cart and someone adds 2
  // more, this checks whether 5 total fits, not whether 2 fits.
  private async assertAvailable(productId: string, requestedTotal: number): Promise<void> {
    const stockInfo = await this.inventoryService.getStockInfoMap([productId]);
    const available = stockInfo[productId]?.quantityAvailable ?? 0;
    if (requestedTotal > available) {
      throw new BadRequestException(
        `Only ${available} of this product ${available === 1 ? 'is' : 'are'} available`,
      );
    }
  }

  async getCart(customerId: string): Promise<CartEntity> {
    return this.getOrCreateActiveCart(customerId);
  }

  // Adding a product already in the cart bumps its quantity instead of
  // creating a duplicate row - matches the UNIQUE(cart_id, product_id)
  // constraint from the migration, which would otherwise reject a second
  // row for the same product outright.
  async addItem(customerId: string, dto: AddToCartDto): Promise<CartEntity> {
    const cart = await this.getOrCreateActiveCart(customerId);
    // findOne throws NotFoundException if the product doesn't exist or
    // isn't active - same check every public product read already uses.
    const product = await this.productsService.findOne(dto.productId);

    const existing = await this.itemRepo.findOne({
      where: { cartId: cart.id, productId: dto.productId },
    });
    const desiredTotal = (existing?.quantity ?? 0) + dto.quantity;
    await this.assertAvailable(dto.productId, desiredTotal);

    if (existing) {
      existing.quantity = desiredTotal;
      await this.itemRepo.save(existing);
    } else {
      // unitPrice is a snapshot, captured once, right now - see
      // cart-item.entity.ts for why this isn't just a live join to
      // products.price.
      const item = this.itemRepo.create({
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice: Number(product.price),
      });
      await this.itemRepo.save(item);
    }

    return this.getOrCreateActiveCart(customerId);
  }

  async updateItem(
    customerId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartEntity> {
    const item = await this.findOwnedItem(customerId, itemId);
    await this.assertAvailable(item.productId, dto.quantity);

    item.quantity = dto.quantity;
    await this.itemRepo.save(item);

    return this.getOrCreateActiveCart(customerId);
  }

  async removeItem(customerId: string, itemId: string): Promise<CartEntity> {
    const item = await this.findOwnedItem(customerId, itemId);
    await this.itemRepo.remove(item);
    return this.getOrCreateActiveCart(customerId);
  }

  // Empties the cart's items but keeps the cart row itself (still ACTIVE) -
  // "clear" means "empty it out," not "end this shopping session." The
  // next addItem() call reuses this same cart rather than creating a new one.
  async clearCart(customerId: string): Promise<CartEntity> {
    const cart = await this.getOrCreateActiveCart(customerId);
    await this.itemRepo.delete({ cartId: cart.id });
    return this.getOrCreateActiveCart(customerId);
  }

  // Re-checks every item in the cart against CURRENT inventory - time has
  // passed since items were added, so this can catch cases where stock
  // dropped in the meantime (another customer bought it, a warehouse
  // correction, etc.). Read-only: never modifies the cart or creates
  // anything, matching this phase's explicit "checkout is a confirmation
  // screen only" scope.
  async validateCheckout(customerId: string): Promise<CheckoutValidationResult> {
    const cart = await this.getOrCreateActiveCart(customerId);
    if (cart.items.length === 0) return { valid: true, issues: [] };

    const stockInfo = await this.inventoryService.getStockInfoMap(
      cart.items.map((item) => item.productId),
    );

    const issues = cart.items
      .map((item) => ({
        productId: item.productId,
        requested: item.quantity,
        available: stockInfo[item.productId]?.quantityAvailable ?? 0,
      }))
      .filter((issue) => issue.requested > issue.available);

    return { valid: issues.length === 0, issues };
  }

  // Called from ProductsService.remove() before a product row is deleted.
  // cart_items.product_id has no ON DELETE CASCADE (deliberately - see
  // cart-item.entity.ts), so deleting a product that's sitting in any
  // customer's cart would otherwise fail with a foreign key violation,
  // same class of bug Phase 3 hit with inventory. This has nothing to do
  // with the "employees can't access customer carts" rule - an admin
  // deleting a product from the catalog is a completely separate action
  // from touching /cart directly; this just keeps the two features from
  // corrupting each other's data.
  async removeProductFromCarts(productId: string): Promise<void> {
    await this.itemRepo.delete({ productId });
  }
}
