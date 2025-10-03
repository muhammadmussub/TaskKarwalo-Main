export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          cancellation_reason: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          commission_amount: number | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_location_lat: number | null
          customer_location_lng: number | null
          customer_location_shared_at: string | null
          description: string | null
          final_price: number | null
          id: string
          location: string
          location_access_active: boolean | null
          location_access_expires_at: string | null
          proposed_price: number
          provider_id: string
          scheduled_date: string | null
          service_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
           cancellation_reason?: string | null
           cancelled_by?: string | null
           cancelled_at?: string | null
           commission_amount?: number | null
           completed_at?: string | null
           created_at?: string
           customer_id: string
           customer_location_lat?: number | null
           customer_location_lng?: number | null
           customer_location_shared_at?: string | null
           description?: string | null
           final_price?: number | null
           id?: string
           location: string
           location_access_active?: boolean | null
           location_access_expires_at?: string | null
           proposed_price: number
           provider_id: string
           scheduled_date?: string | null
           service_id: string
           status?: string
           title: string
           updated_at?: string
         }
        Update: {
           cancellation_reason?: string | null
           cancelled_by?: string | null
           cancelled_at?: string | null
           commission_amount?: number | null
           completed_at?: string | null
           created_at?: string
           customer_id?: string
           customer_location_lat?: number | null
           customer_location_lng?: number | null
           customer_location_shared_at?: string | null
           description?: string | null
           final_price?: number | null
           id?: string
           location?: string
           location_access_active?: boolean | null
           location_access_expires_at?: string | null
           proposed_price?: number
           provider_id?: string
           scheduled_date?: string | null
           service_id?: string
           status?: string
           title?: string
           updated_at?: string
         }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          id: string
          message_type: string
          price_offer: number | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          id?: string
          message_type?: string
          price_offer?: number | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          price_offer?: number | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_banned: boolean | null
          is_suspended: boolean | null
          last_strike_date: string | null
          no_show_strikes_count: number | null
          phone: string | null
          phone_verified: boolean | null
          suspension_end_time: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_banned?: boolean | null
          is_suspended?: boolean | null
          last_strike_date?: string | null
          no_show_strikes_count?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          suspension_end_time?: string | null
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_banned?: boolean | null
          is_suspended?: boolean | null
          last_strike_date?: string | null
          no_show_strikes_count?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          suspension_end_time?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          admin_approved: boolean | null
          admin_notes: string | null
          application_status: string | null
          business_address: string
          business_certificate: string | null
          business_name: string
          business_type: string
          cnic: string | null
          cnic_back_image: string | null
          cnic_front_image: string | null
          created_at: string
          description: string | null
          documents_uploaded: boolean | null
          experience_years: number | null
          id: string
          latitude: number | null
          license_certificate: string | null
          location_updated_at: string | null
          longitude: number | null
          phone: string | null
          profile_photo: string | null
          proof_of_address: string | null
          rating: number | null
          rejection_reason: string | null
          shop_photos: string[] | null
          submitted_at: string | null
          total_commission: number | null
          total_earnings: number | null
          total_jobs: number | null
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_pro: boolean | null
        }
        Insert: {
          admin_approved?: boolean | null
          admin_notes?: string | null
          application_status?: string | null
          business_address: string
          business_certificate?: string | null
          business_name: string
          business_type: string
          cnic?: string | null
          cnic_back_image?: string | null
          cnic_front_image?: string | null
          created_at?: string
          description?: string | null
          documents_uploaded?: boolean | null
          experience_years?: number | null
          id?: string
          latitude?: number | null
          license_certificate?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          profile_photo?: string | null
          proof_of_address?: string | null
          rating?: number | null
          rejection_reason?: string | null
          shop_photos?: string[] | null
          submitted_at?: string | null
          total_commission?: number | null
          total_earnings?: number | null
          total_jobs?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_pro?: boolean | null
        }
        Update: {
          admin_approved?: boolean | null
          admin_notes?: string | null
          application_status?: string | null
          business_address?: string
          business_certificate?: string | null
          business_name?: string
          business_type?: string
          cnic?: string | null
          cnic_back_image?: string | null
          cnic_front_image?: string | null
          created_at?: string
          description?: string | null
          documents_uploaded?: boolean | null
          experience_years?: number | null
          id?: string
          latitude?: number | null
          license_certificate?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          profile_photo?: string | null
          proof_of_address?: string | null
          rating?: number | null
          rejection_reason?: string | null
          shop_photos?: string[] | null
          submitted_at?: string | null
          total_commission?: number | null
          total_earnings?: number | null
          total_jobs?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_pro?: boolean | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          provider_id: string
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          provider_id: string
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          admin_approved: boolean | null
          base_price: number
          category: string
          created_at: string
          description: string
          duration_hours: number | null
          id: string
          images: string[] | null
          is_active: boolean | null
          price_negotiable: boolean | null
          provider_id: string
          service_area: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_approved?: boolean | null
          base_price: number
          category: string
          created_at?: string
          description: string
          duration_hours?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price_negotiable?: boolean | null
          provider_id: string
          service_area?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_approved?: boolean | null
          base_price?: number
          category?: string
          created_at?: string
          description?: string
          duration_hours?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price_negotiable?: boolean | null
          provider_id?: string
          service_area?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Add the commission_payments table definition
      commission_payments: {
        Row: {
          amount: number
          booking_count: number
          id: string
          payment_method: string
          provider_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          amount: number
          booking_count: number
          id?: string
          payment_method: string
          provider_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          amount?: number
          booking_count?: number
          id?: string
          payment_method?: string
          provider_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      // Add the realtime_stats table definition
      realtime_stats: {
        Row: {
          id: string
          stat_type: string
          stat_name: string
          stat_value: number
          stat_trend: number | null
          time_period: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stat_type: string
          stat_name: string
          stat_value: number
          stat_trend?: number | null
          time_period: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stat_type?: string
          stat_name?: string
          stat_value?: number
          stat_trend?: number | null
          time_period?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Add the pro_badge_requests table definition
      pro_badge_requests: {
        Row: {
          id: string
          provider_id: string
          request_message: string | null
          status: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          request_message?: string | null
          status?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          request_message?: string | null
          status?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_badge_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pro_badge_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      // Content management tables
      content_sections: {
        Row: {
          id: string
          section_key: string
          title: string
          content: string
          content_type: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          section_key: string
          title: string
          content: string
          content_type?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          section_key?: string
          title?: string
          content?: string
          content_type?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_information: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          address: string | null
          website: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          category: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          category?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          category?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          id: string
          policy_key: string
          title: string
          content: string
          version: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          policy_key: string
          title: string
          content: string
          version?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          policy_key?: string
          title?: string
          content?: string
          version?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      no_show_strikes: {
        Row: {
          id: string
          user_id: string
          booking_id: string
          provider_id: string
          strike_date: string
          reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          booking_id: string
          provider_id: string
          strike_date?: string
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          booking_id?: string
          provider_id?: string
          strike_date?: string
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_show_strikes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "no_show_strikes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_show_strikes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      user_suspensions: {
        Row: {
          id: string
          user_id: string
          suspension_reason: string
          suspension_start: string
          suspension_end: string
          is_active: boolean
          created_by: string | null
          auto_suspension: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          suspension_reason: string
          suspension_start?: string
          suspension_end: string
          is_active?: boolean
          created_by?: string | null
          auto_suspension?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          suspension_reason?: string
          suspension_start?: string
          suspension_end?: string
          is_active?: boolean
          created_by?: string | null
          auto_suspension?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_suspensions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const