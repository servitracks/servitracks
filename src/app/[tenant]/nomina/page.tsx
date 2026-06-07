"use client";

import { useState, useMemo } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { useNominaStore, EmpleadoNomina, NominaPeriodo, NominaDetalle } from "@/store/useNominaStore";
import { calcularRetenciones } from "@/lib/nomina-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, FileText, Calculator, Plus, Search, CheckCircle, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const formatRD = (amount: number) => {
  return `RD$ ${amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function NominaPage() {
  const { tenant } = useParams();
  const { tenants } = useStore();
  const { empleados, nominas, addEmpleado, updateEmpleado, addNomina, updateNomina } = useNominaStore();
  
  const currentTenant = tenants.find(t => t.slug === tenant) || null;
  const tenantId = currentTenant?.id || "";

  const [activeTab, setActiveTab] = useState("personal");
  
  // -- Personal State --
  const [searchEmp, setSearchEmp] = useState("");
  const [isEmpDialogOpen, setIsEmpDialogOpen] = useState(false);
  const [empForm, setEmpForm] = useState<Partial<EmpleadoNomina>>({});
  
  const tenantEmpleados = useMemo(() => {
    return empleados.filter(e => e.tenantId === tenantId);
  }, [empleados, tenantId]);

  const filteredEmpleados = useMemo(() => {
    return tenantEmpleados.filter(e => 
      e.nombres.toLowerCase().includes(searchEmp.toLowerCase()) || 
      e.apellidos.toLowerCase().includes(searchEmp.toLowerCase()) ||
      e.cedula.includes(searchEmp)
    );
  }, [tenantEmpleados, searchEmp]);

  // -- Generación State --
  const tenantNominas = useMemo(() => {
    return nominas.filter(n => n.tenantId === tenantId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [nominas, tenantId]);

  const [isGenDialogOpen, setIsGenDialogOpen] = useState(false);
  const [genTipo, setGenTipo] = useState<'quincenal'|'mensual'>('quincenal');
  const [genTitulo, setGenTitulo] = useState("");
  
  // -- Handlers Personal --
  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.cedula || !empForm.nombres || !empForm.apellidos || !empForm.salarioBase) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    
    if (empForm.id) {
      updateEmpleado(empForm.id, empForm);
      toast.success("Empleado actualizado");
    } else {
      addEmpleado({
        ...empForm,
        id: `emp-nom-${Date.now()}`,
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estado: 'activo',
        tipoCobro: empForm.tipoCobro || 'quincenal',
        dependientes: empForm.dependientes || 0,
      } as EmpleadoNomina);
      toast.success("Empleado registrado");
    }
    setIsEmpDialogOpen(false);
    setEmpForm({});
  };

  const openEditEmp = (emp: EmpleadoNomina) => {
    setEmpForm(emp);
    setIsEmpDialogOpen(true);
  };

  // -- Handlers Generación --
  const handlePreviewNomina = () => {
    if (!genTitulo) {
      toast.error("Debe indicar un título para la nómina");
      return;
    }
    
    const empleadosActivos = tenantEmpleados.filter(e => e.estado === 'activo' && e.tipoCobro === genTipo);
    if (empleadosActivos.length === 0) {
      toast.error("No hay empleados activos con ese tipo de cobro");
      return;
    }

    const detalles: NominaDetalle[] = empleadosActivos.map(emp => {
      // Si es quincenal, se calcula retenciones sobre el salario de la quincena.
      // Ojo: TSS se reporta mensual, pero aquí simplificamos prorrateando el tope/calculo
      const salarioBaseCalculo = genTipo === 'quincenal' ? emp.salarioBase / 2 : emp.salarioBase;
      const retenciones = calcularRetenciones(salarioBaseCalculo);
      
      return {
        id: `det-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        empleadoId: emp.id,
        salarioBase: salarioBaseCalculo,
        comisiones: 0, // Aquí se podría integrar con comisiones pendientes
        horasExtras: 0,
        otrosIngresos: 0,
        salarioBruto: salarioBaseCalculo,
        sfs: retenciones.sfs,
        afp: retenciones.afp,
        isr: retenciones.isr,
        prestamos: 0,
        otrasDeducciones: 0,
        salarioNeto: retenciones.salarioNeto
      };
    });

    const totalBruto = detalles.reduce((sum, d) => sum + d.salarioBruto, 0);
    const totalTss = detalles.reduce((sum, d) => sum + d.sfs + d.afp, 0);
    const totalIsr = detalles.reduce((sum, d) => sum + d.isr, 0);
    const totalNeto = detalles.reduce((sum, d) => sum + d.salarioNeto, 0);

    const nuevaNomina: NominaPeriodo = {
      id: `nom-${Date.now()}`,
      tenantId,
      titulo: genTitulo,
      fechaInicio: new Date().toISOString(), // Idealmente se seleccionan
      fechaFin: new Date().toISOString(),
      tipo: genTipo,
      estado: 'borrador',
      detalles,
      totalBruto,
      totalTss,
      totalIsr,
      totalNeto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addNomina(nuevaNomina);
    setIsGenDialogOpen(false);
    toast.success("Pre-nómina generada exitosamente. Verifique en Borradores.");
  };

  const handleAprobarNomina = (nomId: string) => {
    updateNomina(nomId, { estado: 'aprobada' });
    toast.success("Nómina Aprobada");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Nómina y Personal
          </h1>
          <p className="text-neutral-500">Gestión de empleados, cálculos de TSS e ISR (DGII).</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-neutral-200 p-1 rounded-xl h-auto">
          <TabsTrigger value="personal" className="rounded-lg py-2.5 px-4 font-semibold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Users className="w-4 h-4 mr-2" /> Personal
          </TabsTrigger>
          <TabsTrigger value="generacion" className="rounded-lg py-2.5 px-4 font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <Calculator className="w-4 h-4 mr-2" /> Generación Nómina
          </TabsTrigger>
          <TabsTrigger value="reportes" className="rounded-lg py-2.5 px-4 font-semibold data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
            <FileText className="w-4 h-4 mr-2" /> Reportes / TSS
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: PERSONAL ── */}
        <TabsContent value="personal" className="mt-6 space-y-4">
          <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CardTitle className="font-heading text-lg font-bold text-neutral-900">Directorio de Empleados</CardTitle>
                <Badge variant="outline" className="rounded-full bg-white">{filteredEmpleados.length}</Badge>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder="Buscar empleado..." 
                    value={searchEmp}
                    onChange={(e) => setSearchEmp(e.target.value)}
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
                <Button 
                  onClick={() => { setEmpForm({}); setIsEmpDialogOpen(true); }}
                  className="rounded-xl bg-[#0f3b6c] hover:bg-blue-900 text-white font-bold h-10"
                >
                  <Plus className="w-4 h-4 mr-1" /> Nuevo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-xs">
                      <th className="p-4">Cédula</th>
                      <th className="p-4">Empleado</th>
                      <th className="p-4">Cargo</th>
                      <th className="p-4">Tipo Cobro</th>
                      <th className="p-4 text-right">Salario Base</th>
                      <th className="p-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredEmpleados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-neutral-400 font-medium">
                          No se encontraron empleados registrados.
                        </td>
                      </tr>
                    ) : (
                      filteredEmpleados.map(emp => (
                        <tr key={emp.id} className="hover:bg-neutral-50/50 cursor-pointer" onClick={() => openEditEmp(emp)}>
                          <td className="p-4 font-mono text-xs">{emp.cedula}</td>
                          <td className="p-4 font-semibold text-neutral-800">{emp.nombres} {emp.apellidos}</td>
                          <td className="p-4 text-neutral-600">{emp.cargo}</td>
                          <td className="p-4 text-neutral-600 capitalize">{emp.tipoCobro}</td>
                          <td className="p-4 text-right font-bold text-neutral-900">{formatRD(emp.salarioBase)}</td>
                          <td className="p-4 text-center">
                            <Badge className={cn(
                              "rounded-md border-none font-semibold",
                              emp.estado === 'activo' ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                            )}>
                              {emp.estado.toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: GENERACIÓN NÓMINA ── */}
        <TabsContent value="generacion" className="mt-6 space-y-4">
          <div className="flex justify-end mb-4">
            <Button 
              onClick={() => { setGenTitulo(""); setIsGenDialogOpen(true); }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-lg shadow-emerald-600/20"
            >
              <Calculator className="w-4 h-4 mr-2" /> Correr Nómina
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {tenantNominas.length === 0 ? (
              <Card className="border-dashed border-2 border-neutral-200 bg-neutral-50 rounded-2xl">
                <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                  <Calculator className="h-12 w-12 text-neutral-300 mb-4" />
                  <h3 className="text-lg font-bold text-neutral-700 mb-1">Sin Registros</h3>
                  <p className="text-neutral-500 text-sm max-w-sm">No has generado ninguna nómina todavía. Presiona "Correr Nómina" para calcular la primera quincena o mes.</p>
                </CardContent>
              </Card>
            ) : (
              tenantNominas.map(nom => (
                <Card key={nom.id} className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="p-5 border-b border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="font-bold text-lg">{nom.titulo}</CardTitle>
                      <CardDescription>Generada: {new Date(nom.createdAt).toLocaleDateString('es-DO')} • Tipo: <span className="capitalize">{nom.tipo}</span></CardDescription>
                    </div>
                    <Badge className={cn(
                      "rounded-lg px-3 py-1 font-bold border-none",
                      nom.estado === 'borrador' ? "bg-amber-100 text-amber-800" :
                      nom.estado === 'aprobada' ? "bg-blue-100 text-blue-800" :
                      "bg-emerald-100 text-emerald-800"
                    )}>
                      {nom.estado.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                        <span className="text-xs text-neutral-500 uppercase font-bold block mb-1">Total Bruto</span>
                        <span className="text-lg font-black text-neutral-800">{formatRD(nom.totalBruto)}</span>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                        <span className="text-xs text-rose-500 uppercase font-bold block mb-1">Retenciones TSS</span>
                        <span className="text-lg font-black text-rose-700">{formatRD(nom.totalTss)}</span>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                        <span className="text-xs text-rose-500 uppercase font-bold block mb-1">Retenciones ISR</span>
                        <span className="text-lg font-black text-rose-700">{formatRD(nom.totalIsr)}</span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <span className="text-xs text-emerald-600 uppercase font-bold block mb-1">Neto a Pagar</span>
                        <span className="text-lg font-black text-emerald-700">{formatRD(nom.totalNeto)}</span>
                      </div>
                    </div>
                    
                    <details className="group">
                      <summary className="text-sm font-bold text-blue-600 cursor-pointer hover:underline mb-3 list-none">
                        Ver Detalles de Empleados ({nom.detalles.length})
                      </summary>
                      <div className="overflow-x-auto mt-2 border border-neutral-100 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500">
                            <tr>
                              <th className="p-3">Empleado</th>
                              <th className="p-3 text-right">Bruto</th>
                              <th className="p-3 text-right">SFS (3.04%)</th>
                              <th className="p-3 text-right">AFP (2.87%)</th>
                              <th className="p-3 text-right">ISR</th>
                              <th className="p-3 text-right text-emerald-700 font-bold">Neto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {nom.detalles.map(det => {
                              const emp = empleados.find(e => e.id === det.empleadoId);
                              return (
                                <tr key={det.id}>
                                  <td className="p-3 font-semibold">{emp?.nombres} {emp?.apellidos}</td>
                                  <td className="p-3 text-right tabular-nums">{formatRD(det.salarioBruto)}</td>
                                  <td className="p-3 text-right text-rose-600 tabular-nums">-{formatRD(det.sfs)}</td>
                                  <td className="p-3 text-right text-rose-600 tabular-nums">-{formatRD(det.afp)}</td>
                                  <td className="p-3 text-right text-rose-600 tabular-nums">-{formatRD(det.isr)}</td>
                                  <td className="p-3 text-right font-bold text-emerald-700 tabular-nums">{formatRD(det.salarioNeto)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </details>

                    {nom.estado === 'borrador' && (
                      <div className="mt-5 flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          Descartar
                        </Button>
                        <Button 
                          onClick={() => handleAprobarNomina(nom.id)}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                          <Check className="w-4 h-4 mr-2" /> Aprobar Nómina
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── TAB: REPORTES / TSS ── */}
        <TabsContent value="reportes" className="mt-6 space-y-4">
           <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl">
            <CardHeader className="p-5 border-b border-neutral-100">
              <CardTitle className="font-bold">Exportación TSS (SUIR)</CardTitle>
              <CardDescription>Genera el archivo TXT con las novedades para subir al portal de la Tesorería de la Seguridad Social.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-start gap-4">
              <div className="flex gap-4 w-full md:w-auto">
                <Select defaultValue="202606">
                  <SelectTrigger className="w-[180px] rounded-xl h-10">
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="202606">Junio 2026</SelectItem>
                    <SelectItem value="202605">Mayo 2026</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="rounded-xl bg-[#0f3b6c] hover:bg-blue-900 font-bold gap-2">
                  <Download className="w-4 h-4" /> Generar TXT
                </Button>
              </div>
              <p className="text-xs text-neutral-400 max-w-lg mt-2">
                Nota: Esta funcionalidad generará la "Plantilla de Autodeterminación" con los datos actualizados de los empleados registrados en el sistema. Debe asegurarse de que las cédulas y salarios base sean correctos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Empleado */}
      <Dialog open={isEmpDialogOpen} onOpenChange={setIsEmpDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-heading text-xl">{empForm.id ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cédula *</Label>
                <Input 
                  placeholder="000-0000000-0"
                  value={empForm.cedula || ""}
                  onChange={(e) => setEmpForm({...empForm, cedula: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={empForm.estado || "activo"} onValueChange={(v: any) => setEmpForm({...empForm, estado: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombres *</Label>
                <Input 
                  value={empForm.nombres || ""}
                  onChange={(e) => setEmpForm({...empForm, nombres: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellidos *</Label>
                <Input 
                  value={empForm.apellidos || ""}
                  onChange={(e) => setEmpForm({...empForm, apellidos: e.target.value})}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input 
                  value={empForm.cargo || ""}
                  onChange={(e) => setEmpForm({...empForm, cargo: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cobro</Label>
                <Select value={empForm.tipoCobro || "quincenal"} onValueChange={(v: any) => setEmpForm({...empForm, tipoCobro: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Salario Base (Mensual) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">RD$</span>
                <Input 
                  type="number"
                  className="pl-12 rounded-xl font-bold"
                  value={empForm.salarioBase || ""}
                  onChange={(e) => setEmpForm({...empForm, salarioBase: parseFloat(e.target.value)})}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 bg-neutral-50">
            <Button variant="outline" onClick={() => setIsEmpDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveEmp} className="rounded-xl bg-[#0f3b6c] hover:bg-blue-900 text-white font-bold">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Correr Nómina */}
      <Dialog open={isGenDialogOpen} onOpenChange={setIsGenDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>Correr Nómina</DialogTitle>
            <DialogDescription>Se calcularán las retenciones de TSS e ISR para los empleados activos correspondientes al tipo seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título del Periodo</Label>
              <Input 
                placeholder="Ej. 1ra Quincena Junio 2026"
                value={genTitulo}
                onChange={(e) => setGenTitulo(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pago</Label>
              <Select value={genTipo} onValueChange={(v: any) => setGenTipo(v)}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handlePreviewNomina} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Generar Pre-nómina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}