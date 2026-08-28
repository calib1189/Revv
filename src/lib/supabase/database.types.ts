// Hand-written to match supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript --linked` once this project
// is linked to a live Supabase project — do not hand-edit after that.

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
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_media_id: string | null;
          is_admin: boolean;
          is_verified: boolean;
          onboarded_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_media_id?: string | null;
          is_admin?: boolean;
          is_verified?: boolean;
          onboarded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_media_id?: string | null;
          is_admin?: boolean;
          is_verified?: boolean;
          onboarded_at?: string | null;
          created_at?: string;
        };
        Relationships: never[];
      };
      media: {
        Row: {
          id: string;
          owner_id: string;
          storage_path: string;
          kind: "image" | "video";
          width: number | null;
          height: number | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          storage_path: string;
          kind: "image" | "video";
          width?: number | null;
          height?: number | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media"]["Insert"]>;
        Relationships: never[];
      };
      vehicles: {
        Row: {
          id: string;
          owner_id: string;
          year: number | null;
          make: string | null;
          model: string | null;
          trim: string | null;
          engine: string | null;
          drivetrain: string | null;
          color: string | null;
          mileage: number | null;
          nickname: string | null;
          description: string | null;
          hero_media_id: string | null;
          category: string;
          ownership_verification_status: "none" | "pending" | "approved" | "rejected";
          ownership_verification_media_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          year?: number | null;
          make?: string | null;
          model?: string | null;
          trim?: string | null;
          engine?: string | null;
          drivetrain?: string | null;
          color?: string | null;
          mileage?: number | null;
          nickname?: string | null;
          description?: string | null;
          hero_media_id?: string | null;
          category?: string;
          ownership_verification_status?: "none" | "pending" | "approved" | "rejected";
          ownership_verification_media_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
        Relationships: never[];
      };
      vehicle_media: {
        Row: {
          id: string;
          vehicle_id: string;
          media_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          media_id: string;
          position?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["vehicle_media"]["Insert"]
        >;
        Relationships: never[];
      };
      builds: {
        Row: {
          id: string;
          vehicle_id: string;
          status: "active" | "draft" | "archived";
          title: string | null;
          budget_cents: number | null;
          copied_from_build_id: string | null;
          ai_rating_score: number | null;
          ai_rating_summary: string | null;
          ai_rating_strengths: string | null;
          ai_rating_limiting_factors: string | null;
          ai_rating_rated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          status?: "active" | "draft" | "archived";
          title?: string | null;
          budget_cents?: number | null;
          copied_from_build_id?: string | null;
          ai_rating_score?: number | null;
          ai_rating_summary?: string | null;
          ai_rating_strengths?: string | null;
          ai_rating_limiting_factors?: string | null;
          ai_rating_rated_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["builds"]["Insert"]>;
        Relationships: never[];
      };
      parts: {
        Row: {
          id: string;
          brand: string | null;
          product: string | null;
          category: string | null;
          part_number: string | null;
          specs: Json;
          verified: boolean;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand?: string | null;
          product?: string | null;
          category?: string | null;
          part_number?: string | null;
          specs?: Json;
          verified?: boolean;
          source?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["parts"]["Insert"]>;
        Relationships: never[];
      };
      build_parts: {
        Row: {
          id: string;
          build_id: string;
          part_id: string | null;
          raw_name: string;
          category: string | null;
          status: "planned" | "ordered" | "installed";
          price_cents: number | null;
          install_cost_cents: number | null;
          installed_at: string | null;
          notes: string | null;
          media_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          build_id: string;
          part_id?: string | null;
          raw_name: string;
          category?: string | null;
          status?: "planned" | "ordered" | "installed";
          price_cents?: number | null;
          install_cost_cents?: number | null;
          installed_at?: string | null;
          notes?: string | null;
          media_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["build_parts"]["Insert"]>;
        Relationships: never[];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          vehicle_id: string | null;
          build_id: string | null;
          post_type: "photo" | "video";
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          vehicle_id?: string | null;
          build_id?: string | null;
          post_type?: "photo" | "video";
          caption?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: never[];
      };
      post_media: {
        Row: {
          id: string;
          post_id: string;
          media_id: string;
          position: number;
        };
        Insert: {
          id?: string;
          post_id: string;
          media_id: string;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["post_media"]["Insert"]>;
        Relationships: never[];
      };
      post_hotspots: {
        Row: {
          id: string;
          post_id: string;
          media_id: string;
          x: number;
          y: number;
          t_ms: number | null;
          build_part_id: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          media_id: string;
          x: number;
          y: number;
          t_ms?: number | null;
          build_part_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["post_hotspots"]["Insert"]
        >;
        Relationships: never[];
      };
      likes: {
        Row: { user_id: string; post_id: string; created_at: string };
        Insert: { user_id: string; post_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["likes"]["Insert"]>;
        Relationships: never[];
      };
      saves: {
        Row: { user_id: string; post_id: string; created_at: string };
        Insert: { user_id: string; post_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["saves"]["Insert"]>;
        Relationships: never[];
      };
      post_views: {
        Row: {
          id: string;
          post_id: string;
          viewer_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          viewer_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_views"]["Insert"]>;
        Relationships: never[];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          body: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: never[];
      };
      follows: {
        Row: {
          follower_id: string;
          followee_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followee_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
        Relationships: never[];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "post" | "comment" | "profile" | "vehicle";
          target_id: string;
          reason: string;
          status: "open" | "reviewed" | "dismissed";
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "post" | "comment" | "profile" | "vehicle";
          target_id: string;
          reason: string;
          status?: "open" | "reviewed" | "dismissed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: never[];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          actor_id: string | null;
          target_type: string | null;
          target_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          actor_id?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notifications"]["Insert"]
        >;
        Relationships: never[];
      };
      maintenance: {
        Row: {
          id: string;
          vehicle_id: string;
          kind: string;
          performed_at: string;
          mileage: number | null;
          cost_cents: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          kind: string;
          performed_at: string;
          mileage?: number | null;
          cost_cents?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["maintenance"]["Insert"]
        >;
        Relationships: never[];
      };
      meetups: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          description: string | null;
          location_name: string;
          lat: number | null;
          lng: number | null;
          starts_at: string;
          created_at: string;
          status: "pending_payment" | "active";
          tier: "standard" | "promoted";
          price_cents: number;
          stripe_checkout_session_id: string | null;
        };
        Insert: {
          id?: string;
          host_id: string;
          title: string;
          description?: string | null;
          location_name: string;
          lat?: number | null;
          lng?: number | null;
          starts_at: string;
          created_at?: string;
          status?: "pending_payment" | "active";
          tier?: "standard" | "promoted";
          price_cents?: number;
          stripe_checkout_session_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["meetups"]["Insert"]>;
        Relationships: never[];
      };
      meetup_media: {
        Row: {
          id: string;
          meetup_id: string;
          media_id: string;
          position: number;
        };
        Insert: {
          id?: string;
          meetup_id: string;
          media_id: string;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["meetup_media"]["Insert"]>;
        Relationships: never[];
      };
      events: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          props: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          props?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: never[];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: never[];
      };
      signup_attempts: {
        Row: { id: string; ip: string; created_at: string };
        Insert: { id?: string; ip: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["signup_attempts"]["Insert"]>;
        Relationships: never[];
      };
      marketplace_search_attempts: {
        Row: { id: string; ip: string; created_at: string };
        Insert: { id?: string; ip: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["marketplace_search_attempts"]["Insert"]>;
        Relationships: never[];
      };
      shops_search_attempts: {
        Row: { id: string; ip: string; created_at: string };
        Insert: { id?: string; ip: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["shops_search_attempts"]["Insert"]>;
        Relationships: never[];
      };
      shop_promotions: {
        Row: {
          id: string;
          promoter_id: string;
          place_id: string;
          place_name: string;
          price_cents: number;
          tier: "standard" | "featured" | "diamond";
          status: "pending_payment" | "active";
          stripe_checkout_session_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          promoter_id: string;
          place_id: string;
          place_name: string;
          price_cents: number;
          tier?: "standard" | "featured" | "diamond";
          status?: "pending_payment" | "active";
          stripe_checkout_session_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shop_promotions"]["Insert"]>;
        Relationships: never[];
      };
      places_search_cache: {
        Row: { cache_key: string; response: Json; created_at: string };
        Insert: { cache_key: string; response: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["places_search_cache"]["Insert"]>;
        Relationships: never[];
      };
      ai_identify_attempts: {
        Row: { id: string; user_id: string; created_at: string };
        Insert: { id?: string; user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["ai_identify_attempts"]["Insert"]>;
        Relationships: never[];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blocks"]["Insert"]>;
        Relationships: never[];
      };
      conversations: {
        Row: {
          id: string;
          user_a_id: string;
          user_b_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_a_id: string;
          user_b_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["conversations"]["Insert"]
        >;
        Relationships: never[];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: never[];
      };
      ad_campaigns: {
        Row: {
          id: string;
          advertiser_id: string;
          headline: string;
          caption: string | null;
          media_id: string;
          destination_url: string;
          tier: "starter" | "standard" | "featured";
          price_cents: number;
          duration_days: number;
          status: "pending_payment" | "pending_review" | "active" | "rejected" | "ended";
          stripe_checkout_session_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          advertiser_id: string;
          headline: string;
          caption?: string | null;
          media_id: string;
          destination_url: string;
          tier: "starter" | "standard" | "featured";
          price_cents: number;
          duration_days: number;
          status?: "pending_payment" | "pending_review" | "active" | "rejected" | "ended";
          stripe_checkout_session_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ad_campaigns"]["Insert"]>;
        Relationships: never[];
      };
      ad_events: {
        Row: {
          id: string;
          campaign_id: string;
          kind: "impression" | "click";
          viewer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          kind: "impression" | "click";
          viewer_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ad_events"]["Insert"]>;
        Relationships: never[];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
