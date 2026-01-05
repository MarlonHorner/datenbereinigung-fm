import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database type definitions for better type safety
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          street: string;
          zip_code: string;
          city: string;
          status: string;
          type: 'traeger' | 'einrichtung' | null;
          is_validated: boolean;
          parent_organization_id: string | null;
          company_id: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          street: string;
          zip_code: string;
          city: string;
          status?: string;
          type?: 'traeger' | 'einrichtung' | null;
          is_validated?: boolean;
          parent_organization_id?: string | null;
          company_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          street?: string;
          zip_code?: string;
          city?: string;
          status?: string;
          type?: 'traeger' | 'einrichtung' | null;
          is_validated?: boolean;
          parent_organization_id?: string | null;
          company_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          email: string;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      heyflows: {
        Row: {
          id: string;
          heyflow_id: string;
          url: string;
          designation: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          heyflow_id: string;
          url: string;
          designation: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          heyflow_id?: string;
          url?: string;
          designation?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_contacts: {
        Row: {
          organization_id: string;
          contact_id: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          contact_id: string;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          contact_id?: string;
          created_at?: string;
        };
      };
      organization_heyflows: {
        Row: {
          organization_id: string;
          heyflow_id: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          heyflow_id: string;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          heyflow_id?: string;
          created_at?: string;
        };
      };
      wizard_sessions: {
        Row: {
          id: string;
          session_name: string;
          current_step: number;
          state_data: Record<string, any>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_name: string;
          current_step?: number;
          state_data?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_name?: string;
          current_step?: number;
          state_data?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
