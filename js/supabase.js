const { createClient } = window.supabase;
const supabaseClient = createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.key,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
