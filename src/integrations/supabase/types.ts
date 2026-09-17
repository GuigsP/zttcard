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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      card_packs: {
        Row: {
          card_id: string
          created_at: string
          pack_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          pack_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_packs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          attrs: Json
          card_number: number
          created_at: string
          id: string
          legacy_id: string | null
          name: string
          ovr: number
          position: string
          quote: string
          real_name: string | null
          side: string
          tier: number
          updated_at: string
        }
        Insert: {
          attrs?: Json
          card_number?: number
          created_at?: string
          id?: string
          legacy_id?: string | null
          name: string
          ovr: number
          position: string
          quote?: string
          real_name?: string | null
          side: string
          tier: number
          updated_at?: string
        }
        Update: {
          attrs?: Json
          card_number?: number
          created_at?: string
          id?: string
          legacy_id?: string | null
          name?: string
          ovr?: number
          position?: string
          quote?: string
          real_name?: string | null
          side?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string
          created_at: string
          handle: string
          id: string
          page: string
          rating: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          comment?: string
          created_at?: string
          handle?: string
          id?: string
          page?: string
          rating: string
          user_agent?: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          handle?: string
          id?: string
          page?: string
          rating?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      match_moves: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          player_id: string
          room_id: string
          seq: number
          side: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          player_id: string
          room_id: string
          seq: number
          side: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          player_id?: string
          room_id?: string
          seq?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_moves_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      match_rooms: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          guest_avatar: string | null
          guest_cup_pack: string | null
          guest_nickname: string | null
          guest_player_id: string | null
          host_avatar: string
          host_cup_pack: string
          host_nickname: string
          host_player_id: string
          id: string
          seed: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          guest_avatar?: string | null
          guest_cup_pack?: string | null
          guest_nickname?: string | null
          guest_player_id?: string | null
          host_avatar: string
          host_cup_pack?: string
          host_nickname: string
          host_player_id: string
          id?: string
          seed: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          guest_avatar?: string | null
          guest_cup_pack?: string | null
          guest_nickname?: string | null
          guest_player_id?: string | null
          host_avatar?: string
          host_cup_pack?: string
          host_nickname?: string
          host_player_id?: string
          id?: string
          seed?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      packs: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
