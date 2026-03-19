"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Solo permitimos usuarios con rol client (admin/cashier caen en su fallback de RoleGuard o pueden ser permitidos)
  // Dejemos que admin y cashier también puedan ver la vista de cliente si quieren (es útil para debug)
  return <RoleGuard allowedRoles={["client", "admin", "cashier"]}>{children}</RoleGuard>;
}
