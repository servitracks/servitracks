import { supabaseAdmin } from "@/lib/supabase";
import type { EmpleadoNomina, NominaPeriodo } from "@/store/useNominaStore";

function dbToEmpleado(row: any): EmpleadoNomina {
  return { id: row.id, tenantId: row.tenant_id, cedula: row.cedula, nombres: row.nombres, apellidos: row.apellidos, cargo: row.cargo, departamento: row.departamento, salarioBase: row.salario_base, tipoCobro: row.tipo_cobro, fechaIngreso: row.fecha_ingreso, estado: row.estado, banco: row.banco, cuentaBancaria: row.cuenta_bancaria, dependientes: row.dependientes, createdAt: row.created_at, updatedAt: row.updated_at };
}
function empleadoToDb(e: EmpleadoNomina) {
  return { id: e.id, tenant_id: e.tenantId, cedula: e.cedula, nombres: e.nombres, apellidos: e.apellidos, cargo: e.cargo, departamento: e.departamento || null, salario_base: e.salarioBase, tipo_cobro: e.tipoCobro, fecha_ingreso: e.fechaIngreso || null, estado: e.estado, banco: e.banco || null, cuenta_bancaria: e.cuentaBancaria || null, dependientes: e.dependientes || 0, created_at: e.createdAt, updated_at: e.updatedAt };
}

function dbToNomina(row: any): NominaPeriodo {
  return { id: row.id, tenantId: row.tenant_id, titulo: row.titulo, fechaInicio: row.fecha_inicio, fechaFin: row.fecha_fin, tipo: row.tipo, estado: row.estado, detalles: row.detalles || [], totalBruto: row.total_bruto, totalTss: row.total_tss, totalIsr: row.total_isr, totalNeto: row.total_neto, createdAt: row.created_at, updatedAt: row.updated_at };
}
function nominaToDb(n: NominaPeriodo) {
  return { id: n.id, tenant_id: n.tenantId, titulo: n.titulo, fecha_inicio: n.fechaInicio || null, fecha_fin: n.fechaFin || null, tipo: n.tipo, estado: n.estado, detalles: n.detalles || [], total_bruto: n.totalBruto, total_tss: n.totalTss, total_isr: n.totalIsr, total_neto: n.totalNeto, created_at: n.createdAt, updated_at: n.updatedAt };
}

export async function loadEmpleadosFromSupabase(tenantId: string): Promise<EmpleadoNomina[]> {
  const { data, error } = await supabaseAdmin.from("empleados_nomina").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] empleados_nomina:", error); return []; }
  return (data || []).map(dbToEmpleado);
}
export async function loadNominasFromSupabase(tenantId: string): Promise<NominaPeriodo[]> {
  const { data, error } = await supabaseAdmin.from("nominas_periodos").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] nominas_periodos:", error); return []; }
  return (data || []).map(dbToNomina);
}

export async function upsertEmpleados(items: EmpleadoNomina[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("empleados_nomina").upsert(items.map(empleadoToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert empleados_nomina:", error);
}
export async function upsertNominas(items: NominaPeriodo[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("nominas_periodos").upsert(items.map(nominaToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert nominas_periodos:", error);
}

export async function syncNominaStoreToSupabase(
  tenantId: string,
  state: { empleados?: EmpleadoNomina[], nominas?: NominaPeriodo[] }
): Promise<void> {
  const tasks = [];
  if (state.empleados) tasks.push(upsertEmpleados(state.empleados.filter(i => i.tenantId === tenantId)));
  if (state.nominas) tasks.push(upsertNominas(state.nominas.filter(i => i.tenantId === tenantId)));
  await Promise.all(tasks);
  console.log(`[sync] Synced nomina state for tenant ${tenantId} to Supabase`);
}
