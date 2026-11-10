'use client';

// Phase 1 (placeholder), filled in Phase 10

// WHAT THIS FILE IS:
// The Warehouse Dashboard - WAREHOUSE_OPERATOR (plus OPERATIONS_MANAGER and
// ADMIN, same as the shipments and inventory screens). One request to
// GET /api/dashboard/warehouse brings back how many orders are waiting to
// be packed or shipped, an inventory summary, and the products at or
// below their low-stock threshold (lowest first).

import DashboardShell, { TwoColumns } from '@/components/dashboard/DashboardShell';
import FiguresCard from '@/components/dashboard/FiguresCard';
import ListCard from '@/components/dashboard/ListCard';
import StatCards from '@/components/dashboard/StatCards';
import { useDashboard } from '@/hooks/useDashboard';
import { getWarehouseDashboard } from '@/lib/api/dashboard';
import { UserRole } from '@/types/user';

const WAREHOUSE_ROLES = [UserRole.WAREHOUSE_OPERATOR, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN];

export default function WarehouseDashboard() {
  const { user, allowed, data, error, handleLogout } = useDashboard(WAREHOUSE_ROLES, getWarehouseDashboard);

  if (!user || !allowed) return null;

  const lowStock = data?.counts.lowStockProducts ?? null;

  return (
    <DashboardShell
      title="Warehouse Dashboard"
      firstName={user.firstName}
      error={error}
      onLogout={handleLogout}
      links={[
        { label: 'Shipments', href: '/dashboard/warehouse/shipments' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Browse Products', href: '/products' },
      ]}
    >
      <StatCards
        cards={[
          {
            label: 'Orders to fulfill',
            value: data?.counts.awaitingFulfillment ?? null,
            caption: 'Not shipped yet',
            href: '/dashboard/warehouse/shipments',
          },
          { label: 'Waiting to pack', value: data?.counts.awaitingPacking ?? null, href: '/dashboard/warehouse/shipments' },
          { label: 'Packed, waiting to ship', value: data?.counts.awaitingShipment ?? null, href: '/dashboard/warehouse/shipments' },
          {
            label: 'Low stock',
            value: lowStock,
            color: lowStock ? 'warning.main' : undefined,
            href: '/inventory',
          },
        ]}
      />

      <TwoColumns>
        <ListCard
          title="Low stock alerts"
          emptyText="Every product is above its low-stock level."
          action={{ label: 'Inventory', href: '/inventory' }}
          rows={
            data?.lowStock.map((item) => ({
              key: item.productId,
              primary: item.productName,
              secondary: `${item.quantityAvailable} available · alert at ${item.lowStockThreshold}`,
              chip:
                item.quantityAvailable === 0
                  ? { label: 'Out of stock', color: 'error' as const }
                  : { label: 'Low', color: 'warning' as const },
              href: `/inventory/edit?id=${item.productId}`,
            })) ?? null
          }
        />

        <FiguresCard
          title="Inventory summary"
          figures={
            data
              ? [
                  { label: 'Products tracked', value: data.inventory.products },
                  {
                    label: 'Out of stock',
                    value: data.inventory.outOfStock,
                    color: data.inventory.outOfStock > 0 ? 'error.main' : undefined,
                  },
                  { label: 'Units available', value: data.inventory.unitsAvailable },
                  { label: 'Units reserved for orders', value: data.inventory.unitsReserved },
                ]
              : null
          }
        />
      </TwoColumns>
    </DashboardShell>
  );
}

