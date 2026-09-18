import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  return createClient<Database>(url, getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
