/**
 * Utilidades para comprimir y convertir imágenes a WebP
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 a 1
}

/**
 * Comprime una imagen y la convierte a formato WebP
 * @param file - Archivo de imagen original
 * @param options - Opciones de compresión
 * @returns Promise con la imagen comprimida en formato WebP como base64
 */
export async function compressAndConvertToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.85
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Crear canvas para redimensionar
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        // Calcular nuevas dimensiones manteniendo el aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Establecer dimensiones del canvas
        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP
        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          resolve(webpDataUrl);
        } catch (error) {
          reject(new Error('Error al convertir la imagen a WebP'));
        }
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Valida que el archivo sea una imagen válida
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Validar tipo de archivo
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato de imagen no válido. Usa JPG, PNG, WebP o GIF.'
    };
  }

  // Validar tamaño (máximo 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'La imagen es demasiado grande. Máximo 5MB.'
    };
  }

  return { valid: true };
}

/**
 * Obtiene el tamaño de una imagen en base64 en KB
 */
export function getBase64Size(base64String: string): number {
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const padding = (base64String.charAt(base64String.length - 2) === '=') ? 2 : 
                  (base64String.charAt(base64String.length - 1) === '=') ? 1 : 0;
  return (base64Length * 0.75 - padding) / 1024; // Retorna en KB
}
