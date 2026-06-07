import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface EmpleadoNomina {
  id: string;
  tenantId: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  departamento: string;
  salarioBase: number;
  tipoCobro: 'quincenal' | 'mensual';
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
  banco?: string;
  cuentaBancaria?: string;
  dependientes: number;
  createdAt: string;
  updatedAt: string;
}

export interface NominaDetalle {
  id: string;
  empleadoId: string;
  salarioBase: number;
  // Ingresos Adicionales
  comisiones: number;
  horasExtras: number;
  otrosIngresos: number;
  // Total Ingresos
  salarioBruto: number;
  // Deducciones
  sfs: number; // Seguro Familiar de Salud
  afp: number; // Fondo de Pensiones
  isr: number; // Impuesto Sobre la Renta
  prestamos: number;
  otrasDeducciones: number;
  // Total a Pagar
  salarioNeto: number;
}

export interface NominaPeriodo {
  id: string;
  tenantId: string;
  titulo: string; // ej. "1ra Quincena Junio 2026"
  fechaInicio: string;
  fechaFin: string;
  tipo: 'quincenal' | 'mensual';
  estado: 'borrador' | 'aprobada' | 'pagada';
  detalles: NominaDetalle[];
  totalBruto: number;
  totalTss: number;
  totalIsr: number;
  totalNeto: number;
  createdAt: string;
  updatedAt: string;
}

interface NominaState {
  empleados: EmpleadoNomina[];
  nominas: NominaPeriodo[];
  
  // Acciones Empleados
  addEmpleado: (empleado: EmpleadoNomina) => void;
  updateEmpleado: (id: string, updates: Partial<EmpleadoNomina>) => void;
  deleteEmpleado: (id: string) => void;
  
  // Acciones Nómina
  addNomina: (nomina: NominaPeriodo) => void;
  updateNomina: (id: string, updates: Partial<NominaPeriodo>) => void;
  deleteNomina: (id: string) => void;
}

export const useNominaStore = create<NominaState>()(
  persist(
    (set) => ({
      empleados: [],
      nominas: [],
      
      addEmpleado: (empleado) =>
        set((state) => ({ empleados: [...state.empleados, empleado] })),
        
      updateEmpleado: (id, updates) =>
        set((state) => ({
          empleados: state.empleados.map((emp) =>
            emp.id === id ? { ...emp, ...updates, updatedAt: new Date().toISOString() } : emp
          ),
        })),
        
      deleteEmpleado: (id) =>
        set((state) => ({
          empleados: state.empleados.filter((emp) => emp.id !== id),
        })),
        
      addNomina: (nomina) =>
        set((state) => ({ nominas: [...state.nominas, nomina] })),
        
      updateNomina: (id, updates) =>
        set((state) => ({
          nominas: state.nominas.map((nom) =>
            nom.id === id ? { ...nom, ...updates, updatedAt: new Date().toISOString() } : nom
          ),
        })),
        
      deleteNomina: (id) =>
        set((state) => ({
          nominas: state.nominas.filter((nom) => nom.id !== id),
        })),
    }),
    {
      name: 'servitracks-nomina-storage',
      version: 1,
    }
  )
);
