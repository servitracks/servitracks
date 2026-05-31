import { useState, useCallback } from "react";
import { initLocalFolder, checkFolderSize, writeFile, readFile, downloadFileToDevice } from "@/lib/localDocsStorage";
import { supabase } from "@/lib/supabase"; // adjust if needed
import { useStore } from "@/store/useStore";

export function useLocalDocs() {
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [folderSize, setFolderSize] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant, currentUserId } = useStore();

  const initialize = useCallback(async () => {
    try {
      const handle = await initLocalFolder();
      if (handle) {
        setFolderHandle(handle);
        setIsReady(true);
        const size = await checkFolderSize(handle);
        setFolderSize(size);
        return handle;
      }
    } catch (err) {
      console.error("Error inicializando carpeta local:", err);
    }
    return null;
  }, []);

  const saveDocument = useCallback(async (file: File, entityType: string, entityId: string) => {
    if (!folderHandle) throw new Error("Carpeta no inicializada");
    if (!currentTenant) throw new Error("No tenant selected");

    setIsLoading(true);
    try {
      // 1. Guardar localmente
      await writeFile(folderHandle, file.name, file);
      
      // 2. Actualizar tamaño local
      const newSize = await checkFolderSize(folderHandle);
      setFolderSize(newSize);

      // 3. Registrar metadatos en Supabase
      const { error } = await supabase.from("documents_metadata").insert({
        tenant_id: currentTenant.id,
        filename: file.name,
        file_type: file.type,
        size_bytes: file.size,
        entity_type: entityType,
        entity_id: entityId,
        created_by: currentUserId,
      });

      if (error) {
        console.error("Error guardando metadatos en Supabase:", error);
        throw error;
      }
      
      // Refrescar lista
      await fetchEntityDocuments(entityType, entityId);
    } finally {
      setIsLoading(false);
    }
  }, [folderHandle, currentTenant, currentUserId]);

  const fetchEntityDocuments = useCallback(async (entityType: string, entityId: string) => {
    if (!currentTenant) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents_metadata")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  const readDocument = useCallback(async (fileName: string) => {
    if (!folderHandle) return null;
    return await readFile(folderHandle, fileName);
  }, [folderHandle]);

  const downloadDocument = useCallback(async (fileName: string) => {
    if (!folderHandle) return;
    await downloadFileToDevice(folderHandle, fileName);
  }, [folderHandle]);

  return {
    isReady,
    folderSize,
    documents,
    isLoading,
    initialize,
    saveDocument,
    readDocument,
    downloadDocument,
    fetchEntityDocuments,
  };
}
