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
    };
    Enums: { [_: string]: never };
  };
}
