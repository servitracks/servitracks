import { useStore } from "@/store/useStore";

export function useRequireAuth() {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const setCurrentUserId = useStore((s) => s.setCurrentUserId);
  
  // Buscar si hay una sesión activa en localStorage o en el store
  const sessionStr = typeof window !== 'undefined' ? localStorage.getItem("servitracks-session") : null;
  let activeUser = users.find(u => u.id === currentUserId) || users[0];
  
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session.empleado_id === 'admin') {
        return {
          empleado: {
            id: "admin_super",
            name: "Super Administrador",
            email: "admin@servitracks.com",
            role: "superadmin"
          }
        };
      } else {
        const found = users.find(u => u.id === session.empleado_id);
        if (found) {
          activeUser = found;
          // Sincronizar el store de Zustand con la sesión persistida
          setTimeout(() => setCurrentUserId(found.id), 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  } else if (currentUserId === 'admin') {
    return {
      empleado: {
        id: "admin_super",
        name: "Super Administrador",
        email: "admin@servitracks.com",
        role: "superadmin"
      }
    };
  }

  return {
    empleado: {
      id: activeUser?.id || "u1",
      name: activeUser?.name || "Yeri Orlando",
      email: activeUser?.email || "yeri@tallergarcia.do",
      role: activeUser?.role || "owner"
    }
  };
}
