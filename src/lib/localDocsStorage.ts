import { openDB } from "idb";

const DB_NAME = "servitracks-docs-db";
const STORE_NAME = "handles";
const HANDLE_KEY = "folderHandle";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveFolderHandleToDB(handle: FileSystemDirectoryHandle) {
  const db = await getDB();
  await db.put(STORE_NAME, handle, HANDLE_KEY);
}

export async function getFolderHandleFromDB(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB();
  return await db.get(STORE_NAME, HANDLE_KEY);
}

export async function verifyPermission(fileHandle: FileSystemDirectoryHandle, readWrite = true) {
  const options: any = {};
  if (readWrite) {
    options.mode = "readwrite";
  }

  const handle = fileHandle as any;

  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }

  if ((await handle.requestPermission(options)) === "granted") {
    return true;
  }

  return false;
}

export async function initLocalFolder(): Promise<FileSystemDirectoryHandle | null> {
  // 1. Intentamos recuperar el handle guardado
  const savedHandle = await getFolderHandleFromDB();

  if (savedHandle) {
    const hasPermission = await verifyPermission(savedHandle);
    if (hasPermission) {
      return savedHandle;
    } else {
      console.warn("Permiso denegado para la carpeta guardada.");
    }
  }

  // 2. Si no hay handle o permisos, pedimos uno nuevo o usamos OPFS
  if ("showDirectoryPicker" in window) {
    try {
      const handle = await (window as any).showDirectoryPicker();
      await saveFolderHandleToDB(handle);
      return handle;
    } catch (error) {
      console.warn("Usuario canceló la selección de carpeta.", error);
      return null;
    }
  } else {
    // 3. Fallback a OPFS (Origin Private File System) para Safari / iOS
    console.log("Usando OPFS como fallback.");
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const servitracksFolder = await opfsRoot.getDirectoryHandle("servitracks_files", { create: true });
      return servitracksFolder;
    } catch (error) {
      console.error("Error al acceder a OPFS:", error);
      return null;
    }
  }
}

export async function writeFile(folderHandle: FileSystemDirectoryHandle, fileName: string, contentBlob: Blob) {
  const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
  // @ts-ignore - createWritable is part of File System API not fully typed everywhere
  const writable = await fileHandle.createWritable();
  await writable.write(contentBlob);
  await writable.close();
}

export async function readFile(folderHandle: FileSystemDirectoryHandle, fileName: string): Promise<ArrayBuffer> {
  const fileHandle = await folderHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return await file.arrayBuffer();
}

export async function checkFolderSize(folderHandle: FileSystemDirectoryHandle): Promise<number> {
  let total = 0;
  // @ts-ignore - values() async iterator
  for await (const entry of folderHandle.values()) {
    if (entry.kind === "file") {
      const file = await entry.getFile();
      total += file.size;
    }
  }
  return total;
}

export async function downloadFileToDevice(folderHandle: FileSystemDirectoryHandle, fileName: string) {
  const fileContentBuffer = await readFile(folderHandle, fileName);
  const blob = new Blob([fileContentBuffer]);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
