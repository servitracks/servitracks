export const TSS_RATES = {
  SFS_EMPLEADO: 0.0304,
  AFP_EMPLEADO: 0.0287,
  SFS_EMPLEADOR: 0.0709,
  AFP_EMPLEADOR: 0.0710,
  SRL_EMPLEADOR: 0.012, // Varía entre 1.1% y 1.3% según el riesgo de la empresa
  INFOTEP_EMPLEADOR: 0.01
};

export const TOPES_SALARIALES = {
  // Topes aproximados (10 salarios mínimos para SFS, 20 para AFP)
  SFS: 193000, 
  AFP: 386000
};

export interface CalculoNomina {
  sfs: number;
  afp: number;
  totalTss: number;
  isr: number;
  salarioNeto: number;
}

export function calcularRetenciones(salarioMensualBruto: number): CalculoNomina {
  // 1. Calcular TSS (SFS y AFP)
  const salarioSFS = Math.min(salarioMensualBruto, TOPES_SALARIALES.SFS);
  const salarioAFP = Math.min(salarioMensualBruto, TOPES_SALARIALES.AFP);

  const sfs = salarioSFS * TSS_RATES.SFS_EMPLEADO;
  const afp = salarioAFP * TSS_RATES.AFP_EMPLEADO;
  const totalTss = sfs + afp;

  // 2. Calcular ISR (Impuesto Sobre la Renta)
  // El ISR se calcula sobre el salario neto después de deducir la TSS
  const salarioAnualNeto = (salarioMensualBruto - totalTss) * 12;
  
  // Escala DGII 2026 (Usando valores de referencia recientes)
  // Hasta RD$416,220.00: Exento
  // De RD$416,220.01 a RD$624,329.00: 15% del excedente
  // De RD$624,329.01 a RD$867,123.00: RD$31,216.00 + 20% del excedente
  // Más de RD$867,123.01: RD$79,776.00 + 25% del excedente
  
  let isrAnual = 0;
  if (salarioAnualNeto > 867123.01) {
    isrAnual = 79776.00 + ((salarioAnualNeto - 867123.01) * 0.25);
  } else if (salarioAnualNeto > 624329.01) {
    isrAnual = 31216.00 + ((salarioAnualNeto - 624329.01) * 0.20);
  } else if (salarioAnualNeto > 416220.01) {
    isrAnual = (salarioAnualNeto - 416220.01) * 0.15;
  }
  
  const isrMensual = Math.max(0, isrAnual / 12);

  // 3. Salario Neto
  const salarioNeto = salarioMensualBruto - totalTss - isrMensual;

  return {
    sfs,
    afp,
    totalTss,
    isr: isrMensual,
    salarioNeto
  };
}

// Para generar el formato TXT de la TSS (Estructura de Autodeterminación)
// Este es un formato básico de ejemplo según las columnas exigidas por el SUIR
export function generarArchivoTSS(empleados: any[], periodo: string) {
  // periodo debe ser YYYYMM (Ej. 202606)
  let contenido = "";
  
  empleados.forEach(emp => {
    // Tipo de Documento: C = Cédula, N = NSS, P = Pasaporte
    const tipoDoc = "C"; 
    // Documento sin guiones
    const doc = emp.cedula.replace(/-/g, '').padEnd(11, ' ');
    const monto = emp.salarioBase.toFixed(2).padStart(12, '0');
    // ... otros campos obligatorios del TXT
    contenido += `${tipoDoc}${doc}                  ${monto}\n`;
  });
  
  return contenido;
}
