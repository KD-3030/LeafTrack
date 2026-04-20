import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client-side Supabase client (uses anon key).
 * Use this in React components and client-side code.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'sohag' },
  global: {
    fetch: (url, options = {}) => {
      // Increase timeout for cloud Supabase (handles cold starts)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
      
      return fetch(url, { 
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});
