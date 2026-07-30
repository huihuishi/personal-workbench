import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 仅在客户端创建 Supabase 实例
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (typeof window === 'undefined') {
    // SSR 时返回一个 mock，避免构建时报错
    return createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    );
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export const supabase = typeof window !== 'undefined'
  ? (supabaseInstance || (supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)))
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    );
