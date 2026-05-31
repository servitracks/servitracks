import React, { useEffect, useRef } from "react";
import { useLocalDocs } from "@/hooks/useLocalDocs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardDrive, Upload, File as FileIcon, Download, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LocalFileManagerProps {
  entityType: string;
  entityId: string;
  title?: string;
}

export function LocalFileManager({ entityType, entityId, title = "Documentos Locales" }: LocalFileManagerProps) {
  const {
    isReady,
    initialize,
    documents,
    isLoading,
    saveDocument,
    fetchEntityDocuments,
    downloadDocument,
  } = useLocalDocs();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Intentar cargar la lista de documentos al montar
  useEffect(() => {
    fetchEntityDocuments(entityType, entityId);
  }, [entityType, entityId, fetchEntityDocuments]);

  const handleConnect = async () => {
    await initialize();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await saveDocument(file, entityType, entityId);
    } catch (err) {
      console.error("Error al subir:", err);
      alert("Hubo un error al guardar el archivo. Asegúrate de haber conectado la carpeta primero.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-blue-500" />
          {title}
        </CardTitle>
        <CardDescription>
          Archivos guardados físicamente en este dispositivo, vinculados a este registro.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isReady ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50/50">
            <HardDrive className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-4 text-center">
              Para guardar o leer archivos grandes, necesitamos conectar una carpeta local en tu dispositivo.
            </p>
            <Button onClick={handleConnect} disabled={isLoading}>
              Conectar Carpeta Local
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Carpeta Conectada
            </Badge>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Subir Archivo
              </Button>
            </div>
          </div>
        )}

        <div className="border rounded-md mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 h-24">
                    No hay documentos guardados aún.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-gray-400" />
                      {doc.filename}
                    </TableCell>
                    <TableCell>{formatSize(Number(doc.size_bytes))}</TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!isReady}
                        onClick={() => downloadDocument(doc.filename)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
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
  );
}
