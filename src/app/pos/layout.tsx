"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  // Los clientes (role: "client") no pueden ingresar al POS a vender
  return <RoleGuard allowedRoles={["admin", "cashier"]}>{children}</RoleGuard>;
}
