import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Cliente público (anon key) — respeta RLS, maneja sesión y JWT automáticamente
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storageKey: "sb-servitracks-auth",
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Alias supabaseAdmin a supabase para garantizar aislamiento multi-tenant y prevenir
// la exposición de claves privilegiadas (service_role) en el bundle del navegador.
export const supabaseAdmin = supabase;
