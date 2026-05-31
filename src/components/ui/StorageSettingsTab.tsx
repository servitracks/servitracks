import React, { useEffect, useState } from "react";
import { useLocalDocs } from "@/hooks/useLocalDocs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardDrive, Download, Loader2, File as FileIcon, Database } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

export function StorageSettingsTab() {
  const {
    isReady,
    initialize,
    folderSize,
    isLoading,
    downloadDocument,
  } = useLocalDocs();

  const { currentTenant } = useStore();
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    // Initializing just to get the current connection status and size without prompting
    initialize().catch(console.error);
  }, [initialize]);

  useEffect(() => {
    if (!currentTenant) return;
    
    const fetchGlobalDocuments = async () => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from("documents_metadata")
          .select("*")
          .eq("tenant_id", currentTenant.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAllDocuments(data || []);
      } catch (err) {
        console.error("Error fetching global documents:", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchGlobalDocuments();
  }, [currentTenant]);

  const handleConnect = async () => {
    try {
      const handle = await initialize();
      if (handle) {
        toast.success("Carpeta local conectada correctamente");
      }
    } catch (e) {
      toast.error("Error al conectar carpeta");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case "customer": return "Cliente";
      case "vehicle": return "Vehículo";
      case "maintenance": return "Mantenimiento";
      case "order": return "Orden";
      case "inventory": return "Inventario";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-neutral-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-blue-500" />
            Almacenamiento Local (Local-First)
          </CardTitle>
          <CardDescription>
            Configura la carpeta de tu computadora donde se guardarán los archivos pesados (imágenes, PDFs). Esto ahorra espacio en la nube y funciona sin internet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isReady ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-200 text-neutral-500'}`}>
                <Database className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-neutral-900">Estado de Conexión</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`border-none ${isReady ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>
                    {isReady ? 'Conectado' : 'Desconectado'}
                  </Badge>
                  {isReady && (
                    <span className="text-xs text-neutral-500 font-medium">
                      Espacio utilizado: {formatSize(folderSize)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={handleConnect} disabled={isLoading} variant={isReady ? "outline" : "default"}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <HardDrive className="h-4 w-4 mr-2" />}
              {isReady ? "Cambiar Carpeta" : "Conectar Carpeta"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-100 shadow-sm">
        <CardHeader>
          <CardTitle>Historial Global de Documentos</CardTitle>
          <CardDescription>
            Auditoría de todos los archivos guardados en todas las áreas de la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Archivo</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-400" />
                    </TableCell>
                  </TableRow>
                ) : allDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-neutral-500 h-32">
                      No se han guardado documentos en esta sucursal.
                    </TableCell>
                  </TableRow>
                ) : (
                  allDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-neutral-400" />
                        <span className="truncate max-w-[200px]" title={doc.filename}>{doc.filename}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[9px] font-black">
                          {getEntityLabel(doc.entity_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {formatSize(Number(doc.size_bytes))}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!isReady}
                          onClick={() => downloadDocument(doc.filename)}
                          className="text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
