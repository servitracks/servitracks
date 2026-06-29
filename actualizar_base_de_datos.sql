-- 1. Eliminar temporalmente las dependencias (Foreign Keys) para poder alterar los tipos
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_customer_id_fkey;
ALTER TABLE maintenance_items DROP CONSTRAINT IF EXISTS maintenance_items_vehicle_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_vehicle_id_fkey;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_customer_id_fkey;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_vehicle_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_vehicle_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;
ALTER TABLE documents_metadata DROP CONSTRAINT IF EXISTS documents_metadata_entity_id_fkey;

-- 2. Alterar el tipo de dato de UUID a TEXT solo para los IDs generados localmente (dejando tenant_id intacto)
ALTER TABLE customers ALTER COLUMN id TYPE TEXT;

ALTER TABLE vehicles ALTER COLUMN id TYPE TEXT;
ALTER TABLE vehicles ALTER COLUMN customer_id TYPE TEXT;

ALTER TABLE products ALTER COLUMN id TYPE TEXT;

ALTER TABLE services ALTER COLUMN id TYPE TEXT;

ALTER TABLE maintenance_items ALTER COLUMN id TYPE TEXT;
ALTER TABLE maintenance_items ALTER COLUMN vehicle_id TYPE TEXT;

ALTER TABLE orders ALTER COLUMN id TYPE TEXT;
ALTER TABLE orders ALTER COLUMN customer_id TYPE TEXT;
ALTER TABLE orders ALTER COLUMN vehicle_id TYPE TEXT;

ALTER TABLE quotes ALTER COLUMN id TYPE TEXT;
ALTER TABLE quotes ALTER COLUMN customer_id TYPE TEXT;
ALTER TABLE quotes ALTER COLUMN vehicle_id TYPE TEXT;

ALTER TABLE invoices ALTER COLUMN id TYPE TEXT;
ALTER TABLE invoices ALTER COLUMN customer_id TYPE TEXT;
ALTER TABLE invoices ALTER COLUMN vehicle_id TYPE TEXT;
ALTER TABLE invoices ALTER COLUMN order_id TYPE TEXT;

ALTER TABLE documents_metadata ALTER COLUMN entity_id TYPE TEXT;
