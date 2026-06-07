import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./app/page";
import Login from "./app/login/page";
import Register from "./app/register/page";
import Recuperar from "./app/recuperar/page";
import Contacto from "./app/contacto/page";
import Nosotros from "./app/nosotros/page";
import NotFound from "./app/not-found";

import DashboardLayout from "./app/[tenant]/layout";
import DashboardPage from "./app/[tenant]/page";
import CustomersPage from "./app/[tenant]/customers/page";
import CustomerDetailPage from "./app/[tenant]/customers/[id]/page";
import InventoryPage from "./app/[tenant]/inventory/page";
import MaintenancePage from "./app/[tenant]/maintenance/page";
import OrdersPage from "./app/[tenant]/orders/page";
import POSPage from "./app/[tenant]/pos/page";
import RemindersPage from "./app/[tenant]/reminders/page";
import ReportsPage from "./app/[tenant]/reports/page";
import ServicesPage from "./app/[tenant]/services/page";
import SettingsPage from "./app/[tenant]/settings/page";
import CajaPage from "./app/[tenant]/caja/page";
import ConversacionesPage from "./app/[tenant]/conversaciones/page";
import ProveedoresPage from "./app/[tenant]/proveedores/page";
import NominaPage from "./app/[tenant]/nomina/page";
import MisComisionesPage from "./app/[tenant]/mis-comisiones/page";
import Admin from "./app/admin/page";
import BlogIndex from "./app/blog/page";
import BlogPost from "./app/blog/[slug]/page";
import PrivacidadPage from "./app/legal/privacidad/page";
import TerminosPage from "./app/legal/terminos/page";
import CookiesPage from "./app/legal/cookies/page";
import { Toaster } from "sonner";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        
        {/* SEO Geo-Localized Landing Pages */}
        <Route path="/software-talleres-mecanicos/:city" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/nosotros" element={<Nosotros />} />

        {/* Superadmin Route */}
        <Route path="/admin" element={<Admin />} />

        {/* Blog Routes (SEO Optimized) */}
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogPost />} />

        {/* Legal Routes */}
        <Route path="/legal/privacidad" element={<PrivacidadPage />} />
        <Route path="/legal/terminos" element={<TerminosPage />} />
        <Route path="/legal/cookies" element={<CookiesPage />} />

        {/* Dashboard Routes wrapped in DashboardLayout */}
        <Route path="/:tenant" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="conversaciones" element={<ConversacionesPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="caja" element={<CajaPage />} />
          <Route path="nomina" element={<NominaPage />} />
          <Route path="mis-comisiones" element={<MisComisionesPage />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}
