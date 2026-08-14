-- Habilitar Supabase Realtime para todas las tablas clave del sistema
-- Esto asegura que los eventos "postgres_changes" se disparen y las computadoras se sincronicen en tiempo real

BEGIN;

DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE 
    orders, 
    invoices, 
    products, 
    customers, 
    vehicles, 
    movements, 
    cajas, 
    movimientos_caja, 
    quotes, 
    inspections, 
    maintenance_items, 
    maintenance_alerts, 
    maintenance_history, 
    technicians, 
    suppliers, 
    supplier_products, 
    purchase_orders, 
    goods_receipts, 
    accounts_payable, 
    quote_requests, 
    empleados_nomina, 
    nominas_periodos, 
    activity_logs, 
    wa_conversations, 
    wa_messages;

COMMIT;
