"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Los clientes (role: "client") no pueden ver el panel de administración
  return <RoleGuard allowedRoles={["admin", "cashier", "propietario"]}>{children}</RoleGuard>;
}
