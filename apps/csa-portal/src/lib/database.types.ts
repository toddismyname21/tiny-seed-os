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
          /** Authorization role (migration 0017). 'admin'/'staff' bypass member-self RLS. */
          role: 'member' | 'admin' | 'staff';
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
          restock_alert_threshold: number;
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
    };
    Enums: { [_: string]: never };
  };
}
