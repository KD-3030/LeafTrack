import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client (uses service_role key).
 * Use this ONLY in API routes and server-side code.
 * This bypasses RLS — never expose to the client.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'sohag' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, { ...options, cache: 'no-store' as RequestCache });
    },
  },
});
