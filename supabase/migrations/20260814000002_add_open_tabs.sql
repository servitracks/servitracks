CREATE TABLE IF NOT EXISTS public.open_tabs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  tab_name TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  mechanic_id TEXT NOT NULL,
  order_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Agregar la tabla a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE open_tabs;
