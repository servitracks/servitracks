import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase"; 
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

export function useLocalDocs() {
  const [isReady, setIsReady] = useState(true); // Siempre true porque es nube
  const [folderSize, setFolderSize] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant, currentUserId } = useStore();

  const initialize = useCallback(async () => {
    setIsReady(true);
    return true;
  }, []);

  const saveDocument = useCallback(async (file: File, entityType: string, entityId: string) => {
    if (!currentTenant) throw new Error("No tenant selected");

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${currentTenant.id}/${entityType}/${entityId}/${fileName}`;

      // 1. Guardar en Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Registrar metadatos en Supabase
      const { error } = await supabase.from("documents_metadata").insert({
        tenant_id: currentTenant.id,
        filename: file.name,
        file_path: filePath, // guardamos la ruta real en storage
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
      toast.success("Documento subido a la nube correctamente");
    } catch (err: any) {
      console.error("Error subiendo a Supabase:", err);
      toast.error("Error al subir archivo: " + err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, currentUserId]);

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

  const downloadDocument = useCallback(async (doc: any) => {
    if (!doc.file_path) {
      toast.error("El documento no tiene una ruta de nube válida.");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 60 * 60); // 1 hora
        
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      console.error("Error descargando:", err);
      toast.error("No se pudo descargar el archivo: " + err.message);
    }
  }, []);

  return {
    isReady,
    folderSize,
    documents,
    isLoading,
    initialize,
    saveDocument,
    downloadDocument,
    fetchEntityDocuments,
  };
}
