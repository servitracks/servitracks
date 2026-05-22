import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan variables de entorno para Supabase. Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
}

// Cliente público (anon key) — respeta RLS, usado para auth y operaciones normales
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storageKey: "sb-servitracks-auth",
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Cliente admin (service_role) — bypasea RLS, SOLO usar para operaciones privilegiadas
// como el registro inicial de un nuevo tenant (donde el usuario aún no tiene sesión activa)
export const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
  auth: {
    storageKey: "sb-servitracks-admin",
    autoRefreshToken: false,
    persistSession: false,
  },
});
