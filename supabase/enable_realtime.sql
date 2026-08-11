-- ================================================================
-- HABILITAR SUPABASE REALTIME EN TABLAS CRÍTICAS
-- Ejecutar este script en el SQL Editor de Supabase (Dashboard)
-- para que los cambios de empleados se vean en tiempo real.
-- ================================================================

-- Agregar tablas a la publicación de replicación de Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE movements;
ALTER PUBLICATION supabase_realtime ADD TABLE cajas;
ALTER PUBLICATION supabase_realtime ADD TABLE movimientos_caja;
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_items;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_history;
ALTER PUBLICATION supabase_realtime ADD TABLE technicians;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE goods_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts_payable;
ALTER PUBLICATION supabase_realtime ADD TABLE services;

-- Verificar que las tablas fueron agregadas correctamente
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
