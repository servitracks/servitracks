import { useStore } from "@/store/useStore";

export function useRequireAuth() {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const setCurrentUserId = useStore((s) => s.setCurrentUserId);

  // Buscar sesión en ambos storages
  const sessionStr = typeof window !== 'undefined'
    ? (localStorage.getItem("servitracks-session") || sessionStorage.getItem("servitracks-session"))
    : null;

  let activeUser = users.find(u => u.id === currentUserId) || users[0];

  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);

      // ── Superadmin: formato legacy (empleado_id:'admin') O nuevo (role:'superadmin') ──
      if (session.empleado_id === 'admin' || session.role === 'superadmin') {
        return {
          empleado: {
            id: "admin_super",
            name: "Super Administrador",
            email: session.email || "admin@servitracks.com",
            role: "superadmin"
          }
        };
      }

      // ── Tenant user: formato legacy (empleado_id) ──
      if (session.empleado_id) {
        const found = users.find(u => u.id === session.empleado_id);
        if (found) {
          activeUser = found;
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
