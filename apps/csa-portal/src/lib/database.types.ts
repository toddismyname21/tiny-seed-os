/**
 * Postgres schema → TypeScript types.
 *
 * MANUAL VERSION (Day 2). Will be regenerated via `supabase gen types
 * typescript --project-id melizsvabemhaqeaqtyw` once we add a Supabase
 * CLI access token. This hand-written stub covers the tables we need
 * for the auth flow + member dashboard.
 *
 * Source schema: supabase/migrations/0001-0014_*.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          legacy_id: string | null;
          customer_type: 'csa' | 'retail' | 'market' | 'wholesale' | 'chef' | 'employee';
          company_name: string | null;
          contact_name: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          delivery_instructions: string | null;
          payment_terms: string | null;
          price_tier: string | null;
          shopify_customer_id: string | null;
          is_active: boolean;
          last_order_date: string | null;
          total_orders: number;
          total_spent: number;
          notes: string | null;
          /** Authorization role (migration 0017; 'crew' added 0068). 'admin'/'staff'
           *  bypass member-self RLS (is_admin_caller). 'crew' is a LIMITED pack/field
           *  role — pack-house ops tables only (is_ops_caller), never member PII. */
          role: 'member' | 'admin' | 'staff' | 'crew';
          /**
           * When the member confirmed they understand their pickup location +
           * day/time via /account/confirm-pickup (migration 0039, Todd
           * directive 2026-06-08). NULL = not yet acknowledged → middleware
           * forces the confirm-pickup interstitial.
           */
          pickup_acknowledged_at: string | null;
          /**
           * CSA route-optimizer inclusion flag (migration 0062). true (default)
           * = this customer's home-delivery address is fed to the optimizer as
           * before. false = excluded from the optimizer and shown only as a
           * MANUAL / not-routable stop on the route planner (deliver by hand).
           */
          routable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['customers']['Row']> & {
          contact_name: string;
          email: string;
          customer_type: Database['public']['Tables']['customers']['Row']['customer_type'];
        };
        Update: Partial<Database['public']['Tables']['customers']['Row']>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          legacy_id: string | null;
          customer_id: string;
          share_type: 'spring_veg' | 'summer_veg' | 'fall_veg' | 'flower' | 'flex' | 'add_on' | 'wholesale_csa';
          share_size: 'small' | 'regular' | 'family' | 'petite' | 'large' | 'light' | 'full' | 'half' | 'quarter' | 'single' | 'double' | null;
          season: string;
          start_date: string;
          end_date: string;
          total_weeks: number;
          weeks_remaining: number;
          pickup_day: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | null;
          pickup_location_id: string | null;
          delivery_address: string | null;
          /** Home-delivery REQUEST marker (migration 0030). NULL = no request.
           *  Pending while set AND delivery_address is still NULL (admin hasn't
           *  approved + set delivery). Set by /api/account/request-delivery —
           *  never charges or sets delivery itself. */
          home_delivery_requested_at: string | null;
          /** The address the member supplied with their home-delivery request
           *  (migration 0030). Captured for staff review; does NOT become
           *  delivery_address until an admin sets it. */
          home_delivery_requested_address: string | null;
          customization_allowed: boolean;
          swap_credits: number;
          vacation_weeks_used: number;
          status: 'active' | 'inactive' | 'paused' | 'pending' | 'cancelled' | 'lapsed' | 'onboarding' | 'expired';
          payment_status: string | null;
          amount_paid: number | null;
          biweekly_week: 'A' | 'B' | null;
          /** Migration 0073 — THE source of truth for weekly-vs-biweekly.
           *  biweekly_week is only meaningful when cadence='biweekly'. */
          cadence: 'weekly' | 'biweekly';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['members']['Row']> & {
          customer_id: string;
          share_type: Database['public']['Tables']['members']['Row']['share_type'];
          season: string;
          start_date: string;
          end_date: string;
          total_weeks: number;
          weeks_remaining: number;
        };
        Update: Partial<Database['public']['Tables']['members']['Row']>;
        Relationships: [];
      };
      pickup_locations: {
        Row: {
          id: string;
          legacy_id: string | null;
          name: string;
          address: string | null;
          city: string | null;
          state: string;
          zip: string | null;
          day_of_week: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | null;
          time_start: string | null;
          time_end: string | null;
          is_delivery_zone: boolean;
          max_capacity: number | null;
          host_name: string | null;
          host_phone: string | null;
          notes: string | null;
          pickup_instructions: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['pickup_locations']['Row']> & {
          name: string;
        };
        Update: Partial<Database['public']['Tables']['pickup_locations']['Row']>;
        Relationships: [];
      };
      member_preferences: {
        Row: {
          member_id: string;
          dislikes: string[];
          allergies: string[];
          preferred_swaps: Json;
          delivery_notes: string | null;
          contact_preference: 'email' | 'sms' | 'both' | 'none';
          newsletter_opt_in: boolean;
          updated_at: string;
        };
        Insert: { member_id: string } & Partial<Database['public']['Tables']['member_preferences']['Row']>;
        Update: Partial<Database['public']['Tables']['member_preferences']['Row']>;
        Relationships: [];
      };
      vacation_holds: {
        Row: {
          id: string;
          member_id: string;
          start_date: string;
          end_date: string;
          reason: string | null;
          status: 'scheduled' | 'active' | 'completed' | 'cancelled';
          created_at: string;
          cancelled_at: string | null;
          // Migration 0041: member self-serve disposition for the held week.
          //   skip   — box simply not packed (default, legacy behaviour)
          //   move   — box delivered on `move_to_week` instead
          //   donate — box donated; farm reallocates it
          disposition: 'skip' | 'move' | 'donate';
          // The MONDAY (week_starting) of the target delivery week when
          // disposition='move'; NULL otherwise.
          move_to_week: string | null;
          // Migration 0052: for add-on RIDER holds only — the BOX hold's id
          // this rider rides (FK → vacation_holds.id). NULL for box holds and
          // member-booked add-on holds. The cancel cascade selects riders by it.
          parent_hold_id: string | null;
        };
        Insert: { member_id: string; start_date: string; end_date: string } & Partial<
          Database['public']['Tables']['vacation_holds']['Row']
        >;
        Update: Partial<Database['public']['Tables']['vacation_holds']['Row']>;
        Relationships: [];
      };
      box_contents: {
        Row: {
          id: string;
          legacy_id: string | null;
          week_date: string;
          share_type: string;
          product_name: string;
          variety: string | null;
          quantity: number;
          unit: string;
          is_swappable: boolean;
          swap_options: string[] | null;
          notes: string | null;
          // FK → product_library.id (box_contents_library_id_fkey). Set when
          // the item was picked from the shared master catalog in the box
          // editor. NULL for legacy rows whose product_name has no catalog
          // match. product_name stays the source of truth for reads
          // (resolveCycle, /box, labels) — library_id is the canonical link.
          library_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { week_date: string; share_type: string; product_name: string; quantity: number; unit: string } & Partial<
          Database['public']['Tables']['box_contents']['Row']
        >;
        Update: Partial<Database['public']['Tables']['box_contents']['Row']>;
        Relationships: [];
      };
      notification_log: {
        Row: {
          id: string;
          member_id: string | null;
          customer_id: string | null;
          channel: 'email' | 'sms' | 'push';
          notification_type: string;
          recipient: string;
          status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed' | 'undelivered';
          provider: 'resend' | 'twilio_verify' | 'twilio_sms' | 'gmail_legacy';
          provider_message_id: string | null;
          subject: string | null;
          template: string | null;
          sent_at: string;
          delivered_at: string | null;
          opened_at: string | null;
          error_message: string | null;
          metadata: Json;
          /** Tag a notification with its originating campaign (migration 0032). NULL for legacy / non-campaign sends. */
          campaign_id: string | null;
        };
        Insert: { channel: Database['public']['Tables']['notification_log']['Row']['channel'];
                  notification_type: string; recipient: string;
                  status: Database['public']['Tables']['notification_log']['Row']['status'];
                  provider: Database['public']['Tables']['notification_log']['Row']['provider'] }
                & Partial<Database['public']['Tables']['notification_log']['Row']>;
        Update: Partial<Database['public']['Tables']['notification_log']['Row']>;
        Relationships: [];
      };
      /** Audit log for the nightly vendor-invoice → QuickBooks Bills cron
       *  (/api/cron/vendor-bills). One row per email candidate the cron
       *  considered, keyed by gmail_message_id for idempotency. `action`
       *  records the disposition. Bill-entry only — this table NEVER records
       *  a payment (the cron makes no payment API calls). */
      vendor_invoice_log: {
        Row: {
          id: string;
          gmail_message_id: string;
          email_date: string | null;
          from_addr: string | null;
          subject: string | null;
          vendor: string | null;
          invoice_number: string | null;
          amount: number | null;
          due_date: string | null;
          action:
            | 'entered'
            | 'flagged_review'
            | 'skipped_duplicate'
            | 'skipped_paid'
            | 'skipped_not_payable';
          qb_bill_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: { gmail_message_id: string;
                  action: Database['public']['Tables']['vendor_invoice_log']['Row']['action'] }
              & Partial<Database['public']['Tables']['vendor_invoice_log']['Row']>;
        Update: Partial<Database['public']['Tables']['vendor_invoice_log']['Row']>;
        Relationships: [];
      };
      box_swaps: {
        Row: {
          id: string;
          member_id: string;
          week_date: string;
          original_item: string;
          swapped_for: string;
          created_at: string;
        };
        Insert: { member_id: string; week_date: string; original_item: string; swapped_for: string }
              & Partial<Database['public']['Tables']['box_swaps']['Row']>;
        Update: Partial<Database['public']['Tables']['box_swaps']['Row']>;
        Relationships: [];
      };
      flex_transactions: {
        Row: {
          id: string;
          member_id: string | null;
          email: string;
          type: 'credit' | 'debit' | 'refund' | 'transfer' | 'adjustment';
          amount: number;
          reason: string | null;
          admin_email: string | null;
          gift_card_id: string | null;
          order_id: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          type: Database['public']['Tables']['flex_transactions']['Row']['type'];
          amount: number;
        } & Partial<Database['public']['Tables']['flex_transactions']['Row']>;
        Update: Partial<Database['public']['Tables']['flex_transactions']['Row']>;
        Relationships: [];
      };
      pickup_attendance: {
        Row: {
          id: string;
          member_id: string;
          week_date: string;
          picked_up: boolean;
          picked_up_at: string | null;
          notes: string | null;
        };
        Insert: { member_id: string; week_date: string } & Partial<
          Database['public']['Tables']['pickup_attendance']['Row']
        >;
        Update: Partial<Database['public']['Tables']['pickup_attendance']['Row']>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          table_name: string;
          row_id: string;
          operation: 'insert' | 'update' | 'delete';
          changed_by: string | null;
          changed_by_email: string | null;
          diff: Json | null;
          changed_at: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: never;  // managed by trigger only
        Update: never;
        Relationships: [];
      };
      delivery_routes: {
        Row: {
          id: string;
          route_date: string;
          driver_id: string | null;
          driver_name: string;
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
          total_stops: number;
          completed_stops: number;
          started_at: string | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { route_date: string } & Partial<
          Database['public']['Tables']['delivery_routes']['Row']
        >;
        Update: Partial<Database['public']['Tables']['delivery_routes']['Row']>;
        Relationships: [];
      };
      delivery_stops: {
        Row: {
          id: string;
          route_id: string;
          pickup_location_id: string | null;
          member_id: string | null;
          // Wholesale (restaurant) stop FK → customers.id. Set when this stop
          // is a wholesale delivery; pickup_location_id + member_id are both
          // NULL in that case. The restaurant's display (name/address/phone)
          // is resolved via wholesale_accounts WHERE customer_id = this value.
          // The migration that adds this column is owned by the route-save
          // stream; declared here so the driver view's SELECT typechecks.
          wholesale_customer_id: string | null;
          stop_order: number;
          status: 'pending' | 'out_for_delivery' | 'arrived' | 'completed' | 'exception';
          scheduled_time: string | null;
          eta: string | null;
          arrived_at: string | null;
          completed_at: string | null;
          proof_photo_url: string | null;
          exception_notes: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { route_id: string; stop_order: number } & Partial<
          Database['public']['Tables']['delivery_stops']['Row']
        >;
        Update: Partial<Database['public']['Tables']['delivery_stops']['Row']>;
        Relationships: [];
      };
      shopify_sync_state: {
        Row: {
          id: number;
          last_synced_at: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['shopify_sync_state']['Row']>;
        Update: Partial<Database['public']['Tables']['shopify_sync_state']['Row']>;
        Relationships: [];
      };
      shopify_order_sync: {
        Row: {
          shopify_order_id: string;
          order_name: string | null;
          members_upserted: number;
          flex_credited: number;
          processed_at: string;
          last_error: string | null;
        };
        Insert: { shopify_order_id: string } & Partial<
          Database['public']['Tables']['shopify_order_sync']['Row']
        >;
        Update: Partial<Database['public']['Tables']['shopify_order_sync']['Row']>;
        Relationships: [];
      };
      // Household sharing (migration 0023). Maps an invited person's email
      // to the owner's account so they can share one CSA login.
      account_members: {
        Row: {
          id: string;
          owner_customer_id: string;
          /** citext — case-insensitive. The invited person's login email. */
          member_email: string;
          status: 'active' | 'removed';
          /** citext — email of whoever sent the invite (the primary). */
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          owner_customer_id: string;
          member_email: string;
        } & Partial<Database['public']['Tables']['account_members']['Row']>;
        Update: Partial<Database['public']['Tables']['account_members']['Row']>;
        Relationships: [];
      };
      // Referral bonus (migration 0024). One code per member; one referrals
      // row per qualifying referred order (referred_order_id UNIQUE = idempotency).
      referral_codes: {
        Row: {
          id: string;
          customer_id: string;
          /** The discount code the member shares (also the Shopify code). */
          code: string;
          /** Shopify DiscountCodeNode GID from discountCodeBasicCreate. */
          shopify_discount_node_id: string | null;
          created_at: string;
        };
        Insert: {
          customer_id: string;
          code: string;
        } & Partial<Database['public']['Tables']['referral_codes']['Row']>;
        Update: Partial<Database['public']['Tables']['referral_codes']['Row']>;
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_customer_id: string | null;
          code: string | null;
          /** The Shopify order that triggered the bonus. UNIQUE — idempotency. */
          referred_order_id: string;
          /** citext — the friend's email. */
          referred_email: string | null;
          amount: number;
          created_at: string;
        };
        Insert: {
          referred_order_id: string;
        } & Partial<Database['public']['Tables']['referrals']['Row']>;
        Update: Partial<Database['public']['Tables']['referrals']['Row']>;
        Relationships: [];
      };
      // Recipe library (migration 0026). source=link → external url;
      // source=farm → our own body. crops[] overlaps box_contents.product_name.
      recipes: {
        Row: {
          id: string;
          title: string;
          source: 'farm' | 'link';
          url: string | null;
          body: string | null;
          crops: string[];
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          source: 'farm' | 'link';
        } & Partial<Database['public']['Tables']['recipes']['Row']>;
        Update: Partial<Database['public']['Tables']['recipes']['Row']>;
        Relationships: [];
      };
      // Per-recipient send ledger (migration 0026). UNIQUE(email_type,
      // week_date, member_email) → per-week idempotency. Service-role write.
      email_log: {
        Row: {
          id: string;
          member_email: string;
          email_type: string;
          week_date: string;
          status: 'sent' | 'failed' | 'skipped';
          resend_id: string | null;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          member_email: string;
          email_type: string;
          week_date: string;
        } & Partial<Database['public']['Tables']['email_log']['Row']>;
        Update: Partial<Database['public']['Tables']['email_log']['Row']>;
        Relationships: [];
      };
      // Per-member HUMAN interaction log (migration 0028). Calls/texts/
      // emails/notes logged by admin/staff from the member-detail page.
      // Keyed on customer_id so it spans seasons. Admin/staff RLS only.
      member_comms: {
        Row: {
          id: string;
          customer_id: string;
          author_email: string | null;
          channel: 'email' | 'phone' | 'text' | 'note' | 'other';
          summary: string;
          created_at: string;
        };
        Insert: {
          customer_id: string;
          summary: string;
        } & Partial<Database['public']['Tables']['member_comms']['Row']>;
        Update: Partial<Database['public']['Tables']['member_comms']['Row']>;
        Relationships: [];
      };
      // Per-pickup-location note board (migration 0029, Stop Notes / chat
      // Phase 0). Phase 0: staff/host authored, members read-only (no member
      // INSERT policy). author_role is reserved-'member' for the Phase-1
      // open-chat upgrade. Soft-delete via hidden_at. report_count + the
      // stop_message_reports table exist now so Phase 1 is policy/trigger-only.
      stop_messages: {
        Row: {
          id: string;
          pickup_location_id: string;
          author_customer_id: string;
          author_display_name: string;
          author_role: 'member' | 'staff' | 'host';
          body: string;
          hidden_at: string | null;
          hidden_by: string | null;
          hidden_reason: 'staff' | 'auto_reports' | 'author' | null;
          report_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          pickup_location_id: string;
          author_customer_id: string;
          author_display_name: string;
          body: string;
        } & Partial<Database['public']['Tables']['stop_messages']['Row']>;
        Update: Partial<Database['public']['Tables']['stop_messages']['Row']>;
        Relationships: [];
      };
      // member_notices — promises/notes made to a member ("notes & notices")
      // that stay OPEN until the team fulfills them. Surfaced on the admin
      // Notices page AND, when stop_hint targets a stop (pickup stop name or
      // 'HOME DELIVERY'), as a LOUD checkbox block at the top of that stop's
      // pack-check / stop-manifest page. stop_hint NULL = general (admin page
      // only). due_week NULL = "next opportunity" (always due).
      member_notices: {
        Row: {
          id: string;
          customer_id: string | null;
          title: string;
          detail: string | null;
          stop_hint: string | null;
          due_week: string | null;
          status: 'open' | 'done' | 'cancelled';
          created_by: string | null;
          created_at: string;
          fulfilled_by: string | null;
          fulfilled_at: string | null;
        };
        Insert: {
          title: string;
        } & Partial<Database['public']['Tables']['member_notices']['Row']>;
        Update: Partial<Database['public']['Tables']['member_notices']['Row']>;
        Relationships: [];
      };
      // ── Retention Wave 1 (migration 0070) ────────────────────────────
      // Admin-edited key/value config the member dashboard reads (renewal
      // banner switch/url/threshold). Authenticated READ + admin FOR ALL. No PII.
      portal_settings: {
        Row: {
          key: string;
          value: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
        } & Partial<Database['public']['Tables']['portal_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['portal_settings']['Row']>;
        Relationships: [];
      };
      // Public waitlist submissions (migration 0070). Written by the service-role
      // /api/waitlist/join endpoint after zod + honeypot validation; admin-only RLS.
      waitlist_signups: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          share_interest: string | null;
          pickup_preference: string | null;
          notes: string | null;
          status: 'new' | 'contacted' | 'converted' | 'archived';
          created_at: string;
        };
        Insert: {
          name: string;
          email: string;
        } & Partial<Database['public']['Tables']['waitlist_signups']['Row']>;
        Update: Partial<Database['public']['Tables']['waitlist_signups']['Row']>;
        Relationships: [];
      };
      // Post-pickup micro-survey rows (migration 0070). Written by the
      // service-role /api/feedback/submit endpoint after HMAC token verification;
      // one row per (week_date, customer_id) — repeat taps UPSERT. Admin-only RLS.
      box_feedback: {
        Row: {
          id: string;
          week_date: string;
          customer_id: string | null;
          member_email: string | null;
          rating: number;
          comment: string | null;
          token: string;
          created_at: string;
        };
        Insert: {
          week_date: string;
          rating: number;
          token: string;
        } & Partial<Database['public']['Tables']['box_feedback']['Row']>;
        Update: Partial<Database['public']['Tables']['box_feedback']['Row']>;
        Relationships: [];
      };
      // Pack & Load per-stop check-off state (migration 0061). One row per
      // (week_starting, stop_id) recording the crew's "stop loaded" toggle.
      // stop_id is the cycle resolver's StopTotals.stop_id (a pickup_location
      // id, the 'home_delivery' sentinel, or 'no_pickup_set'). confirmed_count
      // is the total boxes at click time, for the live stale-guard.
      pack_stop_status: {
        Row: {
          id: string;
          week_starting: string;
          stop_id: string;
          loaded: boolean;
          confirmed_count: number | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          week_starting: string;
          stop_id: string;
        } & Partial<Database['public']['Tables']['pack_stop_status']['Row']>;
        Update: Partial<Database['public']['Tables']['pack_stop_status']['Row']>;
        Relationships: [];
      };
      // Phase-1 member reporting of stop_messages (migration 0029). Created in
      // Phase 0 so the Phase-1 upgrade is policy/trigger/RPC only; stays empty
      // until member reporting ships. Admin-only RLS in Phase 0.
      stop_message_reports: {
        Row: {
          id: string;
          message_id: string;
          reporter_customer_id: string;
          reason: 'spam' | 'harassment' | 'offensive' | 'off_topic' | 'other' | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          message_id: string;
          reporter_customer_id: string;
        } & Partial<Database['public']['Tables']['stop_message_reports']['Row']>;
        Update: Partial<Database['public']['Tables']['stop_message_reports']['Row']>;
        Relationships: [];
      };
      // ── CSA Operations Admin Phase 1 (migration 0031) ───────────────
      // Per-week base box composition. contents is a JSONB array of
      // {crop, qty, unit, notes}. published_at NULL = draft (admin only);
      // non-null = locked + member-visible.
      weekly_box_plan: {
        Row: {
          id: string;
          /** Reserved for future multi-cycle support. Always 'WEEKLY' for Phase 1. */
          cycle_code: 'WEEKLY';
          /** Monday of the cycle's week. */
          week_starting: string;
          share_size: 'small' | 'large' | 'family' | 'regular' | 'light';
          /** JSONB array of {crop: string, qty: number, unit: string, notes?: string}. */
          contents: Json;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          week_starting: string;
          share_size: Database['public']['Tables']['weekly_box_plan']['Row']['share_size'];
        } & Partial<Database['public']['Tables']['weekly_box_plan']['Row']>;
        Update: Partial<Database['public']['Tables']['weekly_box_plan']['Row']>;
        Relationships: [];
      };
      // Curated swap menu for the week. side=swap_out (what can come out
      // of the box) / swap_in (what can go in). available_qty NULL =
      // unlimited; integer caps swap_in supply.
      weekly_swap_menu: {
        Row: {
          id: string;
          cycle_code: 'WEEKLY';
          week_starting: string;
          side: 'swap_out' | 'swap_in';
          item: string;
          unit: string | null;
          available_qty: number | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          week_starting: string;
          side: 'swap_out' | 'swap_in';
          item: string;
        } & Partial<Database['public']['Tables']['weekly_swap_menu']['Row']>;
        Update: Partial<Database['public']['Tables']['weekly_swap_menu']['Row']>;
        Relationships: [];
      };
      // Per-week extras catalog. remaining_qty decrements on order;
      // resets each week. is_active is auto-flipped to false at cutoff
      // by the cron (Phase 2).
      flex_inventory: {
        Row: {
          id: string;
          cycle_code: 'WEEKLY';
          week_starting: string;
          name: string;
          category: string | null;
          unit: string;
          price_cents: number;
          available_qty: number;
          remaining_qty: number;
          photo_url: string | null;
          description: string | null;
          is_active: boolean;
          /** Greyed "Coming Soon" teaser — shown to flex members but NOT
           *  orderable. Paired with is_active=false (migration 0036). */
          coming_soon: boolean;
          /** Week's featured extra (hero treatment on the ordering page). */
          is_featured: boolean;
          restock_alert_threshold: number;
          /** FK → product_library.id — the shared archive product this week's
           *  item was loaded from (photo + description source; migration 0045). */
          library_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          week_starting: string;
          name: string;
          unit: string;
          price_cents: number;
          available_qty: number;
          remaining_qty: number;
        } & Partial<Database['public']['Tables']['flex_inventory']['Row']>;
        Update: Partial<Database['public']['Tables']['flex_inventory']['Row']>;
        Relationships: [];
      };
      // Member orders against flex_inventory. status pending (editable)
      // → locked (cutoff passed, paid) → fulfilled. Cancelled/refunded
      // are end states. cycle close debits Shopify store credit on
      // locked rows.
      flex_orders: {
        Row: {
          id: string;
          cycle_code: 'WEEKLY';
          week_starting: string;
          member_id: string;
          flex_item_id: string;
          qty: number;
          unit_price_cents: number;
          total_cents: number;
          status: 'pending' | 'locked' | 'fulfilled' | 'cancelled' | 'refunded';
          ordered_at: string;
          fulfilled_at: string | null;
        };
        Insert: {
          week_starting: string;
          member_id: string;
          flex_item_id: string;
          qty: number;
          unit_price_cents: number;
          total_cents: number;
        } & Partial<Database['public']['Tables']['flex_orders']['Row']>;
        Update: Partial<Database['public']['Tables']['flex_orders']['Row']>;
        Relationships: [];
      };
      // MARKET OFFERINGS — the farmers-market channel of the unified
      // catalog. Each week staff pick which product_library products are
      // sold at the stall and set the retail unit + price. A product may
      // have MULTIPLE offerings in one week (e.g. by the bunch AND the
      // pound), so there is NO unique (week_starting, library_id) —
      // every offering is its own row (migration 0054).
      market_offerings: {
        Row: {
          id: string;
          // FK → product_library.id (the shared master product).
          library_id: string;
          week_starting: string;
          // FK → pickup_locations.id — the specific market this offering is sold at.
          market_location_id: string | null;
          // Optional display override; falls back to product_library.name.
          name: string | null;
          unit: string;
          price_cents: number;
          is_active: boolean;
          sort_order: number;
          // Planned harvest quantity to bring to the market (farmer's estimate).
          planned_qty: number | null;
          // Post-market reconciliation (set later): unsold + donated amounts.
          leftover_qty: number | null;
          donated_qty: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          library_id: string;
          week_starting: string;
        } & Partial<Database['public']['Tables']['market_offerings']['Row']>;
        Update: Partial<Database['public']['Tables']['market_offerings']['Row']>;
        Relationships: [];
      };
      // Wholesale (chef portal) catalog. Flex-style on/off board: Todd
      // turns a product on (is_active) when it's harvested + available.
      // available_qty: 0 = out of stock, null = unlimited (migration 0044).
      wholesale_products: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          unit: string;
          price_cents: number;
          description: string | null;
          photo_url: string | null;
          available_qty: number | null;
          is_active: boolean;
          sort_order: number;
          // FK → product_library.id — the shared product (photo + quality note).
          library_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
        } & Partial<Database['public']['Tables']['wholesale_products']['Row']>;
        Update: Partial<Database['public']['Tables']['wholesale_products']['Row']>;
        Relationships: [];
      };
      // Shared product master (photo + "today's quality" note) referenced by
      // wholesale_products.library_id. Public-readable (lib_read policy).
      product_library: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          category: string | null;
          photo_url: string | null;
          description: string | null;
          quality_note: string | null;
          quality_week: string | null;
          // Pounds of product in ONE packed unit of a portioned item
          // (migration 0063). e.g. 1/4 lb clamshell salad mix = 0.25; a 12 oz
          // "Big Bag" = 0.75. NULL = unknown → Pick & Pack shows only the count.
          pack_weight_lb: number | null;
          // Shared harvest-line name grouping packaging variants of the SAME
          // raw crop (migration 0064). e.g. "King Spring Mix" and "King Spring
          // (Big Bagz)" both = "King Spring Mix" so Pick & Pack combines them
          // into ONE harvest line (total pounds), with the packaging breakdown
          // underneath. NULL = the product harvests as its own standalone line.
          harvest_crop: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          name: string;
        } & Partial<Database['public']['Tables']['product_library']['Row']>;
        Update: Partial<Database['public']['Tables']['product_library']['Row']>;
        Relationships: [];
      };
      // Chef/restaurant wholesale accounts. order_token is the PERMANENT secret
      // that keys the public /order/<token> ordering page (no login).
      wholesale_accounts: {
        Row: {
          id: string;
          customer_id: string | null;
          restaurant_name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          cluster: string | null;
          status: 'draft' | 'invited' | 'active' | 'paused';
          pricing_tier_id: string | null;
          min_order_cents: number;
          delivery_day: string | null;
          delivery_hours: string | null;
          delivery_instructions: string | null;
          notes: string | null;
          order_token: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          restaurant_name: string;
        } & Partial<Database['public']['Tables']['wholesale_accounts']['Row']>;
        Update: Partial<Database['public']['Tables']['wholesale_accounts']['Row']>;
        Relationships: [];
      };
      // Per-account contact emails with routing flags. A wholesale account can
      // have MULTIPLE contacts, each flagged for what it receives:
      //   - receives_orders   → availability lists + order confirmations
      //   - receives_invoices → billing / invoices
      // (Todd 2026-06-14: e.g. Fet Fisk routes orders→nik@, invoices→accounts@.)
      // RLS is admin/staff-only; chef-facing self-edit goes through a token-
      // authenticated server endpoint using supabaseAdmin scoped to account_id.
      wholesale_account_contacts: {
        Row: {
          id: string;
          account_id: string | null;
          email: string;
          name: string | null;
          receives_orders: boolean;
          receives_invoices: boolean;
          created_at: string | null;
        };
        Insert: {
          email: string;
        } & Partial<Database['public']['Tables']['wholesale_account_contacts']['Row']>;
        Update: Partial<Database['public']['Tables']['wholesale_account_contacts']['Row']>;
        Relationships: [];
      };
      // Per-chef pricing tier (discount_pct off the list price_cents).
      wholesale_pricing_tiers: {
        Row: {
          id: string;
          name: string;
          discount_pct: number;
          created_at: string | null;
        };
        Insert: {
          name: string;
        } & Partial<Database['public']['Tables']['wholesale_pricing_tiers']['Row']>;
        Update: Partial<Database['public']['Tables']['wholesale_pricing_tiers']['Row']>;
        Relationships: [];
      };
      // A placed wholesale order. Token (chef-portal) orders link via account_id
      // and have customer_id NULL + status='submitted'. total_amount is DOLLARS
      // (legacy numeric); per-item exact cents live in wholesale_order_items.
      wholesale_orders: {
        Row: {
          id: string;
          account_id: string | null;
          customer_id: string | null;
          delivery_date: string;
          status: 'draft' | 'submitted' | 'confirmed' | 'packed' | 'delivered' | 'cancelled';
          total_lbs: number | null;
          total_amount: number | null;
          invoice_number: string | null;
          source: string | null;
          external_ref: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          delivery_date: string;
          status: string;
        } & Partial<Database['public']['Tables']['wholesale_orders']['Row']>;
        Update: Partial<Database['public']['Tables']['wholesale_orders']['Row']>;
        Relationships: [];
      };
      // Line items on a wholesale order. unit_price_cents/line_total_cents are
      // the EXACT server-side-priced integers (the source of truth for money).
      wholesale_order_items: {
        Row: {
          id: string;
          order_id: string | null;
          product_id: string | null;
          product_name: string | null;
          qty: number | null;
          unit_price_cents: number | null;
          line_total_cents: number | null;
        };
        Insert: {
          order_id: string;
        } & Partial<Database['public']['Tables']['wholesale_order_items']['Row']>;
        Update: Partial<Database['public']['Tables']['wholesale_order_items']['Row']>;
        Relationships: [];
      };
      // Maps a vendor's own product key (Harvie SKU, or normalized Market Wagon
      // product name) onto our wholesale_products catalog, so the PDF importer
      // (migration 0059) auto-resolves products on re-import. product_id is
      // NULLABLE — an unmapped vendor item still remembers its display name.
      vendor_product_map: {
        Row: {
          id: string;
          vendor: string;
          vendor_key: string;
          product_id: string | null;
          product_name: string | null;
          created_at: string | null;
        };
        Insert: {
          vendor: string;
          vendor_key: string;
        } & Partial<Database['public']['Tables']['vendor_product_map']['Row']>;
        Update: Partial<Database['public']['Tables']['vendor_product_map']['Row']>;
        Relationships: [];
      };
      // Todd's differentiator: a real-time quality photo + note per
      // product per week ("Arugula's a touch small this week but great
      // flavor"). week_starting = cycle Monday (migration 0044).
      wholesale_product_updates: {
        Row: {
          id: string;
          product_id: string | null;
          photo_url: string | null;
          note: string | null;
          week_starting: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          product_id: string;
        } & Partial<Database['public']['Tables']['wholesale_product_updates']['Row']>;
        Update: Partial<Database['public']['Tables']['wholesale_product_updates']['Row']>;
        Relationships: [];
      };
      // One row per (cycle, week, member). Host or admin marks status=
      // picked_up at the stop. UNIQUE (cycle_code, week_starting,
      // member_id) — at most one check-in per member per cycle.
      pickup_checkins: {
        Row: {
          id: string;
          cycle_code: 'WEEKLY';
          week_starting: string;
          member_id: string;
          pickup_location_id: string | null;
          status: 'pending' | 'picked_up' | 'no_show' | 'donated' | 'held' | 'contacted';
          checked_in_at: string | null;
          checked_in_by: string | null;
          note: string | null;
        };
        Insert: {
          week_starting: string;
          member_id: string;
        } & Partial<Database['public']['Tables']['pickup_checkins']['Row']>;
        Update: Partial<Database['public']['Tables']['pickup_checkins']['Row']>;
        Relationships: [];
      };
      // Add-on vendor catalog. lead_time_days default 7 per Todd 2026-05-27
      // (one weekly vendor delivery). add_on_types names what add-on type
      // this vendor supplies (matches member subscription tags).
      vendors: {
        Row: {
          id: string;
          slug: string;
          name: string;
          contact_email: string;
          contact_phone: string | null;
          lead_time_days: number;
          order_template: string | null;
          add_on_types: string[];
          is_active: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          contact_email: string;
        } & Partial<Database['public']['Tables']['vendors']['Row']>;
        Update: Partial<Database['public']['Tables']['vendors']['Row']>;
        Relationships: [];
      };
      // Per-cycle vendor order log. totals auto-computed at the cycle
      // resolve; override_qty captures admin edits before send; sent_at
      // is NULL until admin explicitly clicks Send.
      vendor_orders: {
        Row: {
          id: string;
          cycle_code: 'WEEKLY';
          week_starting: string;
          vendor_id: string;
          totals: Json;
          email_subject: string | null;
          email_body: string | null;
          sent_at: string | null;
          sent_to: string | null;
          override_qty: Json | null;
          notes: string | null;
        };
        Insert: {
          week_starting: string;
          vendor_id: string;
          totals: Json;
        } & Partial<Database['public']['Tables']['vendor_orders']['Row']>;
        Update: Partial<Database['public']['Tables']['vendor_orders']['Row']>;
        Relationships: [];
      };
      // Per-member box swap events. status pending → locked (cutoff
      // passed, applied to pack list) → reverted. credits_used drives
      // members.swap_credits decrement.
      box_swap_events: {
        Row: {
          id: string;
          cycle_code: 'WEEKLY';
          week_starting: string;
          member_id: string;
          swap_out_item: string;
          swap_in_item: string;
          credits_used: number;
          status: 'pending' | 'locked' | 'reverted';
          ordered_at: string;
          locked_at: string | null;
        };
        Insert: {
          week_starting: string;
          member_id: string;
          swap_out_item: string;
          swap_in_item: string;
        } & Partial<Database['public']['Tables']['box_swap_events']['Row']>;
        Update: Partial<Database['public']['Tables']['box_swap_events']['Row']>;
        Relationships: [];
      };
      // ──────────────────────────────────────────────────────────────
      // Admin campaign sender (migration 0032).
      //
      // campaigns: one row per composed marketing email. status moves
      //   draft → sending → sent | partial | failed. recipient_filter is
      //   resolved at send time by lib/campaign.ts → resolveRecipients.
      // ──────────────────────────────────────────────────────────────
      campaigns: {
        Row: {
          id: string;
          name: string;
          subject: string;
          preview_text: string;
          body_html: string;
          recipient_filter: Json;
          status: 'draft' | 'sending' | 'sent' | 'failed' | 'partial';
          scheduled_for: string | null;
          sent_at: string | null;
          sent_by: string | null;
          total_recipients: number;
          total_sent: number;
          total_delivered: number;
          total_opened: number;
          total_clicked: number;
          total_bounced: number;
          total_complained: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          subject: string;
          preview_text: string;
          body_html: string;
        } & Partial<Database['public']['Tables']['campaigns']['Row']>;
        Update: Partial<Database['public']['Tables']['campaigns']['Row']>;
        Relationships: [];
      };
      // campaign_recipients: per-(campaign, customer) send ledger.
      // UNIQUE(campaign_id, customer_id) is the idempotency backstop —
      // a re-run after a daily-cap pause picks up rows still in
      // status='pending' and never double-sends.
      campaign_recipients: {
        Row: {
          id: string;
          campaign_id: string;
          customer_id: string;
          email: string;
          status:
            | 'pending'
            | 'sending'
            | 'sent'
            | 'delivered'
            | 'opened'
            | 'clicked'
            | 'bounced'
            | 'complained'
            | 'unsubscribed'
            | 'failed';
          resend_email_id: string | null;
          sent_at: string | null;
          last_event_at: string | null;
          error_text: string | null;
        };
        Insert: {
          campaign_id: string;
          customer_id: string;
          email: string;
        } & Partial<Database['public']['Tables']['campaign_recipients']['Row']>;
        Update: Partial<Database['public']['Tables']['campaign_recipients']['Row']>;
        Relationships: [];
      };
      // campaign_templates: reusable campaign starters (migration 0034).
      // Backs the composer's "Use template" dropdown + "Save as template"
      // button + the /admin/campaigns/templates CRUD page.
      campaign_templates: {
        Row: {
          id: string;
          name: string;
          category:
            | 'announcement'
            | 'weekly'
            | 'reminder'
            | 'wholesale'
            | 'welcome';
          subject: string;
          preview_text: string;
          body_html: string;
          recipient_filter: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          subject: string;
          preview_text: string;
          body_html: string;
        } & Partial<Database['public']['Tables']['campaign_templates']['Row']>;
        Update: Partial<Database['public']['Tables']['campaign_templates']['Row']>;
        Relationships: [];
      };
      // ── Pixel-based open tracking for 1:1 Gmail sends (migration 0060) ──
      tracked_email_sends: {
        Row: {
          id: string;
          label: string;
          subject: string | null;
          channel: string | null;
          sent_by: string | null;
          recipient_count: number | null;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['tracked_email_sends']['Row']> & {
          label: string;
        };
        Update: Partial<Database['public']['Tables']['tracked_email_sends']['Row']>;
        Relationships: [];
      };
      tracked_email_recipients: {
        Row: {
          id: string;
          send_id: string;
          token: string;
          email: string;
          name: string | null;
          account_id: string | null;
          sent_at: string | null;
          first_opened_at: string | null;
          last_opened_at: string | null;
          open_count: number | null;
          user_agent: string | null;
        };
        Insert: Partial<Database['public']['Tables']['tracked_email_recipients']['Row']> & {
          send_id: string;
          token: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['tracked_email_recipients']['Row']>;
        Relationships: [];
      };
      // End-of-day pack-house shift handoff (migration 0066). One row per
      // (log_date, crew_type) shift — UNIQUE on that key so the save endpoint
      // upserts a crew's single daily handoff. crew_type: 'pack' (Mon/Tue/Thu)
      // or 'field' (Fri weekend-market prep). shift_status drives the read
      // digest's triage color. packed/priorities are flexible jsonb (per-channel
      // done-vs-target object; ≤3-string array). read_by/read_at is the incoming
      // person's I-PASS acknowledgment. Admin/staff-only RLS (is_admin_caller).
      packhouse_handoff: {
        Row: {
          id: string;
          log_date: string;
          crew_type: 'pack' | 'field';
          author_name: string | null;
          next_crew: string | null;
          headcount: number | null;
          shift_status: 'normal' | 'attention' | 'urgent';
          summary: string | null;
          plan_completed: 'yes' | 'partial' | 'no' | null;
          packed: Json | null;
          ph_cooler_temp: number | null;
          barn_cooler_temp: number | null;
          truck_used: boolean;
          truck_temp: number | null;
          cooler_notes: string | null;
          use_first: string | null;
          running_low: string | null;
          quality_issue: string | null;
          equipment_issue: string | null;
          safety_issue: string | null;
          photo_url: string | null;
          priorities: Json | null;
          note_next_crew: string | null;
          read_by: string | null;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          log_date: string;
          crew_type: 'pack' | 'field';
        } & Partial<Database['public']['Tables']['packhouse_handoff']['Row']>;
        Update: Partial<Database['public']['Tables']['packhouse_handoff']['Row']>;
        Relationships: [];
      };
      // Carry-forward pack-house items that persist across days until resolved
      // (migration 0066). OPEN while resolved_at IS NULL; the digest surfaces
      // every open item on every future day with age = today − created_date
      // (ET-local). Resolution is an explicit read-side action — never
      // auto-cleared (fixes the "carryforward zombie" anti-pattern).
      packhouse_open_items: {
        Row: {
          id: string;
          body: string;
          owner: string | null;
          created_handoff_id: string | null;
          created_date: string;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
        };
        Insert: {
          body: string;
        } & Partial<Database['public']['Tables']['packhouse_open_items']['Row']>;
        Update: Partial<Database['public']['Tables']['packhouse_open_items']['Row']>;
        Relationships: [];
      };
      // Logical cooler pallets — one per destination (each market / wholesale
      // order / CSA / other), migration 0067. Tracks zone (ph_accessible /
      // ph_far / barn / van_overflow), a FIFO date_in, an optional 🔴 move_it
      // flag (+ aging/surplus/customer reason), and active/out status. The
      // board is a MOVE LIST, not a physical map — no per-slot tracking. move_it
      // is kept queryable for a future CSA-box-fill / wholesale-availability
      // hook. Admin/staff-only RLS (is_admin_caller).
      cooler_pallets: {
        Row: {
          id: string;
          label: string;
          pallet_type: 'market' | 'wholesale' | 'csa' | 'other';
          zone: 'ph_accessible' | 'ph_far' | 'barn' | 'van_overflow';
          date_in: string;
          move_it: boolean;
          move_it_reason: 'aging' | 'surplus' | 'customer' | null;
          status: 'active' | 'out';
          notes: string | null;
          out_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          label: string;
          pallet_type: 'market' | 'wholesale' | 'csa' | 'other';
        } & Partial<Database['public']['Tables']['cooler_pallets']['Row']>;
        Update: Partial<Database['public']['Tables']['cooler_pallets']['Row']>;
        Relationships: [];
      };
      // Live per-line Pick & Pack check-off status (migration 0069). One row per
      // (week_date, section, scope_day, market_id, line_key). section='harvest'
      // is the PICK view (todo→harvesting→done); csa/wholesale/market are PACK
      // views (todo→packed). market_id is a pickup_locations UUID for
      // section='market', else the all-zero sentinel. Zero member PII — a crop
      // line + status + the crew display name who last touched it. RLS:
      // is_ops_caller (admin/staff/crew). In the supabase_realtime publication.
      pick_pack_progress: {
        Row: {
          id: string;
          week_date: string;
          section: 'harvest' | 'csa' | 'wholesale' | 'market' | 'packhouse';
          scope_day: 'all' | 'mon' | 'thu';
          market_id: string;
          line_key: string;
          status: 'todo' | 'harvesting' | 'done' | 'packed';
          actual_qty: number | null;
          // Pack-crew editable "still need to pick/pull N more" figure (0083).
          needed_qty: number | null;
          // Free-text pack-team note, shown with worked_by (0083).
          note: string | null;
          worked_by: string | null;
          worked_by_id: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          week_date: string;
          section: 'harvest' | 'csa' | 'wholesale' | 'market' | 'packhouse';
          line_key: string;
        } & Partial<Database['public']['Tables']['pick_pack_progress']['Row']>;
        Update: Partial<Database['public']['Tables']['pick_pack_progress']['Row']>;
        Relationships: [];
      };
    };
    Views: {
      member_flex_balance: {
        Row: {
          member_id: string;
          customer_id: string;
          email: string;
          balance: number;
          transaction_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      swap_box_item: {
        Args: {
          p_member_id: string;
          p_week_date: string;
          p_original_item: string;
          p_swapped_for: string;
        };
        Returns: Json;
      };
      undo_box_swap: {
        Args: {
          p_member_id: string;
          p_week_date: string;
          p_original_item: string;
        };
        Returns: Json;
      };
      schedule_vacation_hold: {
        Args: {
          p_member_id: string;
          p_start_date: string;  // YYYY-MM-DD
          p_end_date: string;    // YYYY-MM-DD
          p_reason: string | null;
          // Migration 0041: disposition + optional move target (Monday/
          // week_starting of the target delivery week). Defaulted in SQL so
          // the args remain optional for older callers.
          p_disposition?: 'skip' | 'move' | 'donate';
          p_move_to_week?: string | null; // YYYY-MM-DD (Monday)
        };
        Returns: Json;
      };
      cancel_vacation_hold: {
        Args: {
          p_member_id: string;
          p_hold_id: string;
        };
        Returns: Json;
      };
      change_pickup_location: {
        Args: {
          p_member_id: string;
          p_new_location_id: string | null;
          p_new_delivery_address: string | null;
        };
        Returns: Json;
      };
      // Atomic member flex-order submit (migration 0037). p_lines is a JSON
      // array of { flex_item_id: uuid, qty: int }. Returns { ok:true,... } or
      // { error:... }. See place_flex_order for the full contract.
      place_flex_order: {
        Args: {
          p_member_id: string;
          p_week_starting: string;
          p_lines: Json;
          p_balance_cents: number;
        };
        Returns: Json;
      };
      // Atomic member flex-order cancel (migration 0038). Restocks the
      // member's pending lines for the week and flips them pending→cancelled.
      // Returns { ok:true, cancelled, restocked_cents } or { error:... }.
      cancel_flex_order: {
        Args: {
          p_member_id: string;
          p_week_starting: string;
        };
        Returns: Json;
      };
      is_admin_caller: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      // Household sharing (migration 0023).
      current_customer_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      auth_primary_customer_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      email_is_customer: {
        Args: { p_email: string };
        Returns: boolean;
      };
      household_owner: {
        Args: Record<string, never>;
        Returns: { owner_id: string; contact_name: string; email: string }[];
      };
      // CAN-SPAM one-click unsubscribe (migration 0026). SECURITY DEFINER —
      // callable as anon after the /unsubscribe endpoint verifies the HMAC
      // token. Returns the number of preference rows flipped to opt-out.
      unsubscribe_member_by_email: {
        Args: { p_email: string };
        Returns: number;
      };
      // Stop Notes (migration 0029). The set of pickup_location_ids the
      // caller belongs to (active/paused/onboarding shares), household-resolved
      // via current_customer_id(). Drives the stop_messages member-read policy.
      current_member_location_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      // Zero-barrier CHEF wholesale order (migration 0050). SECURITY DEFINER —
      // callable as anon; the order_token inside p_token is the gate. Resolves
      // the account, SERVER-SIDE-prices each line from wholesale_products
      // (active only), applies the account's pricing-tier discount, writes the
      // order + items. p_lines = [{ product_id: uuid, qty: int }, ...]. Returns
      // { ok:true, order_id, total_cents, item_count, delivery_date,
      // restaurant_name } or { error:<code> }.
      place_wholesale_order: {
        Args: {
          p_token: string;
          p_lines: Json;
          p_delivery_date: string; // YYYY-MM-DD
        };
        Returns: Json;
      };
      // Atomic open-stamp for the pixel endpoint (migration 0060). Sets
      // first/last_opened_at + increments open_count + records UA for the
      // recipient whose token matches. Returns true iff a row matched.
      stamp_email_open: {
        Args: {
          p_token: string;
          p_user_agent: string | null;
        };
        Returns: boolean;
      };
    };
    Enums: { [_: string]: never };
  };
}
