/**
 * Utilidades para manejar la persistencia de sesión
 */

export interface SessionData {
  user_id: string;
  tenant_id?: string;
  email: string;
  role: string;
  iniciado_en: string;
  remember_me: boolean;
}

/**
 * Guarda la sesión en localStorage o sessionStorage según la preferencia
 */
export function saveSession(data: SessionData, rememberMe: boolean) {
  const sessionData = { ...data, remember_me: rememberMe };
  
  if (rememberMe) {
    // Persistir en localStorage (se mantiene después de cerrar el navegador)
    localStorage.setItem("servitracks-session", JSON.stringify(sessionData));
    // Limpiar sessionStorage si existe
    sessionStorage.removeItem("servitracks-session");
  } else {
    // Guardar solo en sessionStorage (se borra al cerrar el navegador)
    sessionStorage.setItem("servitracks-session", JSON.stringify(sessionData));
    // Limpiar localStorage si existe
    localStorage.removeItem("servitracks-session");
  }
}

/**
 * Obtiene la sesión desde localStorage o sessionStorage
 */
export function getSession(): SessionData | null {
  // Primero intentar desde localStorage
  const localSession = localStorage.getItem("servitracks-session");
  if (localSession) {
    try {
      return JSON.parse(localSession);
    } catch {
      return null;
    }
  }
  
  // Si no está en localStorage, intentar desde sessionStorage
  const sessionSession = sessionStorage.getItem("servitracks-session");
  if (sessionSession) {
    try {
      return JSON.parse(sessionSession);
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Elimina la sesión de ambos storages
 */
export function clearSession() {
  localStorage.removeItem("servitracks-session");
  sessionStorage.removeItem("servitracks-session");
}

/**
 * Verifica si hay una sesión activa
 */
export function hasActiveSession(): boolean {
  return getSession() !== null;
}
