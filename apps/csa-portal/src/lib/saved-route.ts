/**
 * saved-route.ts — read the SAVED, optimized delivery route(s) for a week so the
 * printable route-sheet, the box labels, and the pack-check all follow the SAME
 * delivery sequence the planner produced (Todd: "pack order tied to the route").
 *
 * The route planner's "Save & send to driver" writes the optimized order into
 * delivery_routes (one per route_date + leg A/B) + delivery_stops (stop_order,
 * with exactly one of pickup_location_id / member_id / wholesale_customer_id).
 *
 * loadWeekRoutes() returns the week's routes resolved for display AND a global
 * `orderOf` map (orderKey → index) ordered route_date → leg → stop_order, so a
 * caller can sort its own stops/labels into delivery order:
 *   - pickup stop  → orderKey 'pl:' + pickup_location_id
 *   - home member  → orderKey 'cust:' + the member's customer_id
 *   - wholesale    → orderKey 'wc:' + wholesale_customer_id
 * No saved route → hasSavedRoute=false and an empty map (callers fall back).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type DeliveryDay = 'Tue' | 'Wed' | 'Sat';
const DAY_OFFSET: Record<DeliveryDay, number> = { Tue: 1, Wed: 2, Sat: 5 };

function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
export function deliveryDateForDay(weekStarting: string, day: DeliveryDay): string {
  return addDaysYMD(weekStarting, DAY_OFFSET[day]);
}

export interface SavedRouteStop {
  stop_order: number;
  kind: 'pickup' | 'home' | 'wholesale';
  name: string;
  address: string | null;
  phone: string | null;
  scheduledTime: string | null;
  orderKey: string;
}
export interface SavedRouteLeg {
  route_id: string;
  route_date: string;
  leg: string;
  driver_name: string;
  stops: SavedRouteStop[];
}
export interface WeekRoutes {
  hasSavedRoute: boolean;
  legs: SavedRouteLeg[];
  /** orderKey → global index (route_date → leg → stop_order). */
  orderOf: Map<string, number>;
}

export async function loadWeekRoutes(
  supabase: SupabaseClient<Database>,
  weekStarting: string,
): Promise<WeekRoutes> {
  const empty: WeekRoutes = { hasSavedRoute: false, legs: [], orderOf: new Map() };
  const weekEnd = addDaysYMD(weekStarting, 6);

  const { data: routes } = await supabase
    .from('delivery_routes')
    .select('id, route_date, leg, driver_name')
    .gte('route_date', weekStarting)
    .lte('route_date', weekEnd)
    .order('route_date', { ascending: true })
    .order('leg', { ascending: true });
  if (!routes || routes.length === 0) return empty;

  const routeIds = routes.map((r: any) => r.id);
  const { data: stopsRaw } = await supabase
    .from('delivery_stops')
    .select('route_id, stop_order, pickup_location_id, member_id, wholesale_customer_id, scheduled_time')
    .in('route_id', routeIds)
    .order('stop_order', { ascending: true });
  if (!stopsRaw || stopsRaw.length === 0) return empty;

  // Resolve display data for each stop kind.
  const plIds = [...new Set(stopsRaw.filter((s: any) => s.pickup_location_id).map((s: any) => s.pickup_location_id))] as string[];
  const memIds = [...new Set(stopsRaw.filter((s: any) => s.member_id).map((s: any) => s.member_id))] as string[];
  const wcIds = [...new Set(stopsRaw.filter((s: any) => s.wholesale_customer_id).map((s: any) => s.wholesale_customer_id))] as string[];

  const plMap = new Map<string, any>();
  if (plIds.length) {
    const { data } = await supabase.from('pickup_locations').select('id, name, address, city, host_phone').in('id', plIds);
    for (const p of data ?? []) plMap.set((p as any).id, p);
  }
  const memMap = new Map<string, any>();
  if (memIds.length) {
    const { data } = await supabase.from('members').select('id, customer_id, delivery_address, customer:customers ( contact_name, phone )').in('id', memIds);
    for (const m of data ?? []) memMap.set((m as any).id, m);
  }
  const wcMap = new Map<string, any>();
  if (wcIds.length) {
    const { data } = await supabase.from('wholesale_accounts').select('customer_id, restaurant_name, address, phone').in('customer_id', wcIds);
    for (const a of data ?? []) wcMap.set((a as any).customer_id, a);
  }

  const stopsByRoute = new Map<string, any[]>();
  for (const s of stopsRaw as any[]) {
    const arr = stopsByRoute.get(s.route_id) ?? [];
    arr.push(s);
    stopsByRoute.set(s.route_id, arr);
  }

  const orderOf = new Map<string, number>();
  const legs: SavedRouteLeg[] = [];
  let gidx = 0;
  for (const r of routes as any[]) {
    const raw = (stopsByRoute.get(r.id) ?? []).sort((a, b) => a.stop_order - b.stop_order);
    const stops: SavedRouteStop[] = [];
    for (const s of raw) {
      let kind: SavedRouteStop['kind'];
      let name = '', address: string | null = null, phone: string | null = null, orderKey = '';
      if (s.pickup_location_id) {
        const p = plMap.get(s.pickup_location_id);
        kind = 'pickup'; name = p?.name ?? 'Pickup stop';
        address = [p?.address, p?.city].filter(Boolean).join(', ') || null;
        phone = p?.host_phone ?? null; orderKey = 'pl:' + s.pickup_location_id;
      } else if (s.member_id) {
        const m = memMap.get(s.member_id);
        kind = 'home'; name = m?.customer?.contact_name ?? 'Member';
        address = m?.delivery_address ?? null; phone = m?.customer?.phone ?? null;
        orderKey = 'cust:' + (m?.customer_id ?? s.member_id);
      } else {
        const a = wcMap.get(s.wholesale_customer_id);
        kind = 'wholesale'; name = a?.restaurant_name ?? 'Wholesale';
        address = a?.address ?? null; phone = a?.phone ?? null;
        orderKey = 'wc:' + s.wholesale_customer_id;
      }
      if (!orderOf.has(orderKey)) orderOf.set(orderKey, gidx);
      stops.push({ stop_order: s.stop_order, kind, name, address, phone, scheduledTime: s.scheduled_time, orderKey });
      gidx++;
    }
    legs.push({ route_id: r.id, route_date: r.route_date, leg: r.leg ?? 'A', driver_name: r.driver_name, stops });
  }

  return { hasSavedRoute: true, legs, orderOf };
}

/** Format a stored phone as "(412) 555-1212"; passthrough if not 10/11 digits. */
export function fmtPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : raw.trim();
}
