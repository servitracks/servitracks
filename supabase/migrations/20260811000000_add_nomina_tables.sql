CREATE TABLE IF NOT EXISTS public.empleados_nomina (
    id text primary key,
    tenant_id text not null,
    cedula text not null,
    nombres text not null,
    apellidos text not null,
    cargo text not null,
    departamento text,
    salario_base numeric not null,
    tipo_cobro text not null,
    fecha_ingreso text,
    estado text not null,
    banco text,
    cuenta_bancaria text,
    dependientes numeric,
    created_at text not null,
    updated_at text not null
);

CREATE TABLE IF NOT EXISTS public.nominas_periodos (
    id text primary key,
    tenant_id text not null,
    titulo text not null,
    fecha_inicio text,
    fecha_fin text,
    tipo text not null,
    estado text not null,
    detalles jsonb not null default '[]'::jsonb,
    total_bruto numeric not null,
    total_tss numeric not null,
    total_isr numeric not null,
    total_neto numeric not null,
    created_at text not null,
    updated_at text not null
);
