-- 0088_wholesale_fulfillment.sql
--
-- Wholesale order fulfillment: PACK → DELIVER → INVOICE.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- The lifecycle enum (draft/submitted/confirmed/packed/delivered/cancelled) has
-- existed on wholesale_orders since the table was created, and quickbooks.ts
-- already implements findOrCreateCustomer → findOrCreateItem → createInvoice
-- against a LIVE, connected QuickBooks realm. None of it was ever wired up.
--
-- Measured 2026-08-16 against production:
--   • 71 wholesale orders exist
--   • 0 have EVER reached 'packed'
--   • 0 have EVER reached 'delivered'
--   • 1 has an invoice_number
--   • createInvoice() is called from 0 places in the codebase
--
-- That is the mechanical reason $6,508.73 of wholesale sits uninvoiced and why
-- nobody can say what a chef actually received.
--
-- ── THE MISSING PIECE ────────────────────────────────────────────────────────
-- wholesale_order_items records qty (what was ORDERED) but nothing for what was
-- actually PACKED. Todd's requirement is to invoice on DELIVERY, for what was
-- really sent — if a chef orders 5 lb of dandelion greens and gets 3, the
-- invoice must say 3 and the chef must be told before they plan a menu around
-- it. Without a fulfilled quantity that is impossible.
--
-- ── DESIGN ───────────────────────────────────────────────────────────────────
-- qty_packed is NULLABLE and NULL means "not packed yet". The pack UI's default
-- path is ONE TAP — "pack as ordered" copies qty → qty_packed for every line —
-- and the crew only edits a line when reality differs (Todd, 2026-08-16). So the
-- common case costs one action and the exception costs one more.
--
-- fulfillment_status is a GENERATED column, not a stored one, so it can never
-- drift out of sync with the quantities it describes. One source of truth.
--
-- Timestamps (packed_at / delivered_at / invoiced_at) are the audit trail AND
-- the idempotency guard: invoiced_at IS NOT NULL is what stops a retried
-- delivery marking from billing a restaurant twice.
--
-- Purely additive + idempotent. Safe to re-run.


-- ── 1) Per-line fulfilled quantity ───────────────────────────────────────────

alter table public.wholesale_order_items
  add column if not exists qty_packed numeric;

comment on column public.wholesale_order_items.qty_packed is
  'What was ACTUALLY packed for this line (migration 0088). NULL = not packed '
  'yet. The pack UI defaults it to qty ("packed as ordered") in one tap; the '
  'crew only edits when short or unavailable. THE INVOICE IS BUILT FROM THIS '
  'COLUMN, never from qty — we bill what the chef received.';

-- Derived, never stored: cannot drift from the quantities it summarises.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wholesale_order_items'
      and column_name = 'fulfillment_status'
  ) then
    alter table public.wholesale_order_items
      add column fulfillment_status text
      generated always as (
        case
          when qty_packed is null              then 'pending'
          when qty_packed <= 0                 then 'unavailable'
          when qty is null                     then 'packed'
          when qty_packed >= qty               then 'packed'
          else                                      'short'
        end
      ) stored;
  end if;
end $$;

comment on column public.wholesale_order_items.fulfillment_status is
  'GENERATED from qty vs qty_packed (migration 0088): pending | packed | short '
  '| unavailable. Derived rather than stored so it can never contradict the '
  'quantities. Drives the chef shortfall notice.';

-- The pack UI reads "everything for this delivery date not yet packed".
create index if not exists wholesale_order_items_pending_idx
  on public.wholesale_order_items (order_id)
  where qty_packed is null;


-- ── 2) Lifecycle timestamps + actor on the order ─────────────────────────────

alter table public.wholesale_orders
  add column if not exists packed_at     timestamptz,
  add column if not exists packed_by     text,
  add column if not exists delivered_at  timestamptz,
  add column if not exists delivered_by  text,
  add column if not exists invoiced_at   timestamptz,
  add column if not exists notified_at   timestamptz;

comment on column public.wholesale_orders.packed_at is
  'When the crew marked this order packed (migration 0088).';
comment on column public.wholesale_orders.delivered_at is
  'When the driver marked this order delivered (migration 0088). THIS is the '
  'event that triggers invoicing — Todd directive: invoice on delivery, not on '
  'order, because only then is the fulfilled quantity final.';
comment on column public.wholesale_orders.invoiced_at is
  'When a QuickBooks invoice was created for this order (migration 0088). '
  'IDEMPOTENCY GUARD: a non-NULL value must block any second invoice attempt, '
  'so a retried/double-tapped delivery marking can never bill a chef twice.';
comment on column public.wholesale_orders.notified_at is
  'When the chef was last sent a pack/shortfall notice (migration 0088).';

-- Driver + invoice-sweep queries: "delivered but not yet invoiced".
create index if not exists wholesale_orders_uninvoiced_idx
  on public.wholesale_orders (delivery_date)
  where delivered_at is not null and invoiced_at is null;

create index if not exists wholesale_orders_status_date_idx
  on public.wholesale_orders (status, delivery_date);
