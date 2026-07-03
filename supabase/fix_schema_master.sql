NOTIFY pgrst, 'reload schema';

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tc.table_name, kcu.column_name, tc.constraint_name 
             FROM information_schema.table_constraints AS tc 
             JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
             JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
             WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'vehicles' AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ALTER COLUMN ' || quote_ident(r.column_name) || ' TYPE text USING ' || quote_ident(r.column_name) || '::text';
    END LOOP;

    FOR r IN SELECT tc.table_name, kcu.column_name, tc.constraint_name 
             FROM information_schema.table_constraints AS tc 
             JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
             JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
             WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'orders' AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ALTER COLUMN ' || quote_ident(r.column_name) || ' TYPE text USING ' || quote_ident(r.column_name) || '::text';
    END LOOP;

    FOR r IN SELECT tc.table_name, kcu.column_name, tc.constraint_name 
             FROM information_schema.table_constraints AS tc 
             JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
             JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
             WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'cajas' AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ALTER COLUMN ' || quote_ident(r.column_name) || ' TYPE text USING ' || quote_ident(r.column_name) || '::text';
    END LOOP;

    FOR r IN SELECT tc.table_name, kcu.column_name, tc.constraint_name 
             FROM information_schema.table_constraints AS tc 
             JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
             JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
             WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'services' AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ALTER COLUMN ' || quote_ident(r.column_name) || ' TYPE text USING ' || quote_ident(r.column_name) || '::text';
    END LOOP;

    FOR r IN SELECT tc.table_name, kcu.column_name, tc.constraint_name 
             FROM information_schema.table_constraints AS tc 
             JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
             JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
             WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'maintenance_items' AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ALTER COLUMN ' || quote_ident(r.column_name) || ' TYPE text USING ' || quote_ident(r.column_name) || '::text';
    END LOOP;
END $$;

ALTER TABLE public.vehicles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.orders ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.cajas ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.services ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.maintenance_items ALTER COLUMN id TYPE text USING id::text;

NOTIFY pgrst, 'reload schema';
